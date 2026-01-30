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
           "Content-Type": "application/json",
        },
      });
      xaiWs.on('open', () => {
        socket.emit('realtime_status', 'connected');
        console.log(`✅ xAI WS connected for socket ${socket.id}`);
      });
      xaiWs.on('message', (data) => {
        socket.emit('from_xai', data.toString());
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
  socket.on('to_xai', (msg) => {
    if (xaiWs && xaiWs.readyState === WebSocket.OPEN) {
      xaiWs.send(msg);
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