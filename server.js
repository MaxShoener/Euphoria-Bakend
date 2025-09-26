const path = require('path');
const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 10000;

// 1. Serve static files (CSS, JS, images) from /public
app.use(express.static('public'));

// 2. Route: Homepage (serve your index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 3. Example Playwright proxy route
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('Missing ?url= parameter');
  }

  try {
    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    const content = await page.content();
    await browser.close();

    res.send(content);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send(`Error loading ${targetUrl}: ${err.message}`);
  }
});

// 4. Start the server
app.listen(PORT, () => {
  console.log(`🚀 Euphoria running at http://localhost:${PORT}`);
});