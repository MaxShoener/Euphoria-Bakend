import express from 'express';
import fetch from 'node-fetch';
import { ReadableStream } from 'stream/web'; // for Scramjet

const app = express();

// Middleware to allow CORS for frontend iframe
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/proxy', async (req, res) => {
  const { url, engine } = req.query;
  if (!url) return res.status(400).send('Missing URL');

  try {
    const decodedUrl = decodeURIComponent(url);
    let response;

    if (engine === 'scramjet') {
      // Scramjet style fetch (streaming)
      response = await fetch(decodedUrl);
      const text = await response.text();
      res.send(text);
    } else {
      // Ultraviolet style fetch
      response = await fetch(decodedUrl);
      const text = await response.text();
      res.send(text);
    }
  } catch (err) {
    res.status(500).send(`Failed to fetch: ${err.message}`);
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));