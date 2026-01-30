const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
const PORT = 3001;


const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  let xaiWs = null;

  const pendingToolCalls = new Map();
  const toolResolvers = new Map();

  socket.on('tool_result', (data) => {
    const { call_id, result } = data;
    const resolver = toolResolvers.get(call_id);
    if (resolver) {
      clearTimeout(resolver.timeout);
      resolver.resolve(result);
      toolResolvers.delete(call_id);
    } else {
      console.log(`No resolver for tool_result ${call_id}`);
    }
  });
  const connectToXai = async () => {
    try {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) {
        socket.emit('realtime_status', 'error');
        socket.emit('realtime_log', 'No XAI_API_KEY');
        return;
      }
      socket.emit('realtime_status', 'connecting');
      const tokenResponse = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expires_after: { seconds: 300 },
        }),
      });
      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        throw new Error(`Token fetch failed: ${tokenResponse.status} ${errText}`);
      }
      const data = await tokenResponse.json();
      const temp_token = data.value;
      const encodedToken = encodeURIComponent(temp_token);
      const wsUrl = `wss://api.x.ai/v1/realtime`;
      xaiWs = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${temp_token}`,
        },
      });
      xaiWs.on('open', () => {
        socket.emit('realtime_status', 'connected');
        console.log(`✅ xAI WS connected for socket ${socket.id}`);
        const sessionConfig = {
          type: "session.update",
          session: {
  instructions: `You are a helpful voice assistant that can control the frontend app using tools.

Use get_screen_details to inspect available skills and screen info first.

Then use execute_skill with skill_id and optional params to perform actions.

For casual conversation or greetings, respond normally.`,
  voice: "Ara",
  turn_detection: { type: "server_vad" },
  audio: {
    input: { format: { type: "audio/pcm", rate: 24000 } },
    output: { format: { type: "audio/pcm", rate: 24000 } },
  },
  tools: [
    {
      type: "function",
      name: "get_screen_details",
      description: "Get current screen details: list of available skills, window dimensions, current URL.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      type: "function",
      name: "execute_skill",
      description: "Execute a frontend skill by ID. Params optional.",
      parameters: {
        type: "object",
        properties: {
          skill_id: {
            type: "string",
            description: "The skill ID from get_screen_details"
          },
          params: {
            type: "object",
            description: "Optional parameters"
          }
        },
        required: ["skill_id"]
      }
    }
  ]
},
        };
        xaiWs.send(JSON.stringify(sessionConfig));
        socket.emit('realtime_log', '📡 Sent session configuration to xAI');
      });
      xaiWs.on('message', (data) => {
        const msgStr = data.toString();
        console.log(`[${new Date().toLocaleTimeString()}] xAI -> Socket ${socket.id}: ${msgStr.slice(0, 100)}...`);
        try {
          const parsed = JSON.parse(msgStr);
          if (parsed.type === 'input_audio_buffer.speech_started') {
            socket.emit('interrupt_audio');
            console.log(`User speech started - sent interrupt_audio`);
            socket.emit('realtime_log', `🛑 User speaking - interrupting bot audio`);
          } else if (parsed.type === 'response.output_audio.delta') {
            if (parsed.delta) {
              socket.emit('bot_audio', parsed.delta);
            }
            console.log(`Forwarded bot audio delta`);
          } else if (parsed.type === 'response.function_call_args_delta') {
            console.log('Tool args delta:', parsed.args_delta);
            socket.emit('realtime_log', `🛠️ ${parsed.name || 'tool'} args_delta: ${parsed.args_delta}`);
          } else if (parsed.type === 'response.function_call_args_done') {
            console.log('Tool call done:', parsed);
            const { call_id, name, args } = parsed;
            let toolArgs;
            try {
              toolArgs = JSON.parse(args);
            } catch (e) {
              console.error('Invalid tool args:', args, e);
              socket.emit('realtime_log', `❌ Invalid tool args: ${args.slice(0, 100)}`);
              return;
            }
            // Create resolver function that sends result to xAI
            const toolResolve = (result) => {
              if (xaiWs && xaiWs.readyState === WebSocket.OPEN) {
                const toolResultEvent = {
                  type: 'conversation.item.create',
                  item: {
                    type: 'input_tool_use',
                    call_id,
                    content: [{ type: 'input_text', text: result }]
                  }
                };
                xaiWs.send(JSON.stringify(toolResultEvent));
                console.log(`📤 Sent input_tool_use for ${call_id}`);
                socket.emit('realtime_log', `📤 Sent tool result to xAI`);
                // Request next response
                const nextResponseEvent = {
                  type: 'response.create',
                  response: {
                    modalities: ['text', 'audio', 'tools']
                  }
                };
                xaiWs.send(JSON.stringify(nextResponseEvent));
                socket.emit('realtime_log', `🔄 Requested next response after tool`);
              } else {
                console.error('Cannot send tool result: xAI WS not open');
              }
            };
            const timeoutId = setTimeout(() => {
              console.log(`Tool ${call_id} timed out`);
              toolResolvers.delete(call_id);
            }, 30000);
            toolResolvers.set(call_id, { resolve: toolResolve, timeout: timeoutId });
            // Forward to frontend
            socket.emit('tool_request', { call_id, name, args: toolArgs });
            socket.emit('realtime_log', `🛠️ Sent tool_request to frontend: ${name}`);
          }
          socket.emit('realtime_log', `[xAI] ${JSON.stringify(parsed.type)}`);
        } catch (e) {
          console.error('Failed to parse xAI message:', e);
        }
      });
      xaiWs.on('close', () => {
        socket.emit('realtime_status', 'disconnected');
        xaiWs = null;
      });
      xaiWs.on('error', (err) => {
        console.error('xAI WS error for socket', socket.id, ':', err);
        socket.emit('realtime_status', 'error');
      });
    } catch (error) {
      const msg = error.message || String(error);
      console.error(`xAI connect error for socket ${socket.id}:`, msg);
      socket.emit('realtime_status', 'error');
      socket.emit('realtime_log', `❌ ${msg}`);
    }
  };
  socket.on('init_realtime', () => {
    connectToXai();
  });
  socket.on('user_audio', (base64Audio) => {
    console.log(`[${new Date().toLocaleTimeString()}] Socket ${socket.id} -> xAI: audio chunk`);
    if (xaiWs && xaiWs.readyState === WebSocket.OPEN) {
      const event = {
        type: 'input_audio_buffer.append',
        audio: base64Audio
      };
      xaiWs.send(JSON.stringify(event));
    } else {
      socket.emit('realtime_log', '❌ xAI not ready');
    }
  });
  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} disconnected`);
    if (xaiWs) {
      xaiWs.terminate();
    }
  });
});

app.post('/api/chat', async (req, res) => {
  const { message, skills = [] } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }
  console.log(`[POST /api/chat] Incoming message:`, String(message).slice(0, 200));
  console.log(`[POST /api/chat] Skills:`, skills);

  const skillsList = skills.map((s) => `- ${s.id}: ${s.description}`).join('\n') || 'No skills available';

  const systemPrompt = `You are a helpful assistant in a skills-enabled chatbot.
For Hi and hello, reply Hi! How can I help you today?

To use a skill, respond **ONLY** with valid JSON:

{"skill": "skill_id"}

or if parameters needed:

{"skill": "skill_id", "params": {"key": "value"}}

**IMPORTANT**: For skill calls, output ONLY JSON. No extra text, no markdown.

For normal replies, use plain text.`;

  const skillsAssistantMessage = `Available skills (executed in the browser frontend):

${skillsList}`;

  try {
    console.log('[POST /api/chat] Creating completion...');
    const completion = await client.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'assistant', content: skillsAssistantMessage },
        { role: 'user', content: message }
      ],
      stream: false,
    });

    const reply = completion.choices[0].message.content || '';
    console.log(`[POST /api/chat] Reply length: ${reply.length}`);
    res.json({ reply });
  } catch (err) {
    console.error('[POST /api/chat] Error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
});

app.get('/api/realtime-token', async (req, res) => {
  try {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'XAI_API_KEY not set' });
    }

    const tokenResponse = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: { seconds: 300 },
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Token fetch failed: ${tokenResponse.status} ${errText}`);
    }

    const data = await tokenResponse.json();
    console.log('Realtime token data:', data);
    res.json({ temp_token: data.value });
  } catch (error) {
    console.error('Realtime token error:', error);
    res.status(500).json({ error: 'Failed to generate realtime token' });
  }
});

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});