const express = require('express');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 10000;

// Serve static files (index.html)
app.use(express.static(__dirname));

// Proxy endpoint
app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('No URL provided');

  try {
    const browser = await puppeteer.launch({
      executablePath: puppeteer.executablePath(),
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const content = await page.content();
    await browser.close();

    res.send(content);
  } catch (err) {
    console.error(err);
    res.status(500).send('Proxy failed');
  }
});

app.listen(PORT, () => {
  console.log(`Euphoria proxy running on port ${PORT}`);
});
