import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend
app.use(express.static(__dirname));

// Simple proxy for CORS/logins/remote play
app.get('/proxy', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing URL');

  try {
    const response = await fetch(target);
    const text = await response.text();
    res.send(text);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

app.listen(PORT, () => {
  console.log(`Euphoria backend running on port ${PORT}`);
});
