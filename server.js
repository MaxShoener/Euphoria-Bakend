import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 10000;

// Allow requests from your file-based frontend
app.use(cors());

app.get('/browse', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing URL');

  try {
    // Fetch the target page
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Euphoria Browser Proxy)'
      }
    });

    // Stream the content
    const contentType = response.headers.get('content-type') || 'text/html';
    res.setHeader('Content-Type', contentType);
    response.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to fetch the page.');
  }
});

app.listen(PORT, () => {
  console.log(`Euphoria backend running on port ${PORT}`);
});
