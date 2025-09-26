const express = require('express');
const fetch = require('node-fetch'); // fallback if Playwright isn't available
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (optional if hosting index.html on the same repo)
app.use(express.static('public'));

// Simple fetch proxy
app.get('/fetch', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing URL parameter');

  try {
    const response = await fetch(url);
    const html = await response.text();
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to fetch URL');
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Euphoria Proxy running on http://localhost:${PORT}`);
});
