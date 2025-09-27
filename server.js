import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const ALLOWED_ORIGINS = ['*'];

// Simple proxy for browsing
app.get('/browse', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('No URL provided');
  try {
    const response = await fetch(url);
    const html = await response.text();
    res.send(html);
  } catch (err) {
    res.status(500).send('Error loading page: ' + err.message);
  }
});

// Placeholder login API
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    return res.json({ success: true, token: 'fake-jwt-token' });
  }
  res.status(400).json({ success: false, message: 'Invalid credentials' });
});

// Remote play placeholder
app.get('/remote-play', (req, res) => {
  res.send('Remote play feature coming soon!');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
