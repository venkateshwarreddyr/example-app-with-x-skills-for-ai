const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

let count = 0;

app.use(cors());
app.use(express.json());

app.get('/api/count', (req, res) => {
  res.json({ count });
});

app.post('/api/count/increment', (req, res) => {
  count += 1;
  res.json({ count });
});

app.post('/api/count/decrement', (req, res) => {
  count -= 1;
  res.json({ count });
});

app.post('/api/count/reset', (req, res) => {
  count = 0;
  res.json({ count });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});