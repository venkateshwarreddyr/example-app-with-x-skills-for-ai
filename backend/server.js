const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = 3001;

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});