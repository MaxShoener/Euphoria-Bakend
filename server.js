const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch'); // if using Puppeteer/Playwright later, adapt this

const app = express();
const PORT = process.env.PORT || 10000;

// Enable JSON parsing
app.use(bodyParser.json());

// Enable CORS for all origins (so local files can access it)
app.use(cors());

// Example /fetch route
app.post('/fetch', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).send('No URL provided');

  try {
    // If using Puppeteer or Playwright later, replace this with proper scraping
    const response = await fetch(url);
    const html = await response.text();

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching URL');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Euphoria proxy running on port ${PORT}`);
});
