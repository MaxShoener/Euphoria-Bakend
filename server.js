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

// Proxy for logins, Xbox Remote Play, general browsing
app.get('/proxy', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing URL');

  try {
    // Basic fetch proxy; can be extended for cookies/auth
    const response = await fetch(target, { redirect: 'follow' });
    const text = await response.text();
    res.send(text);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

// Optional: Xbox Remote Play endpoint (example placeholder)
app.get('/xbox', (req, res) => {
  res.send('Xbox Remote Play endpoint ready (integrate API)');
});

app.listen(PORT, () => {
  console.log(`Euphoria backend running on port ${PORT}`);
});
