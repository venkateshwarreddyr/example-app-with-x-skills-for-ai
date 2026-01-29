const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = 3001;

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai',
});

app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  let closed = false;
  req.on('close', () => {
    closed = true;
  });

  try {
    const stream = await client.chat.completions.create({
      model: 'grok-2-latest',
      messages: [{ role: 'user', content: message }],
      stream: true,
    });

    for await (const chunk of stream) {
      if (closed) break;
      const delta = chunk?.choices?.[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify(delta)}\\n\\n`);
      }
    }
    if (!closed) {
      res.write('data: [DONE]\\n\\n');
      res.end();
    }
  } catch (err) {
    if (!closed) {
      res.write(`data: ${JSON.stringify('\\n[Error] ' + (err?.message || 'Unknown error'))}\\n\\n`);
      res.write('data: [DONE]\\n\\n');
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});