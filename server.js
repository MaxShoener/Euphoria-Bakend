const express = require('express');
const playwright = require('playwright'); // not playwright-core

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.urlencoded({ extended: true }));

app.get('/proxy', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing URL parameter');

  let browser;
  try {
    // Use Playwright's own Chromium path
    const executablePath = playwright.chromium.executablePath();

    browser = await playwright.chromium.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(target, { waitUntil: 'networkidle' });

    const content = await page.content();
    res.send(content);
  } catch (err) {
    res.status(500).send(`Error loading ${target}: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`Euphoria proxy running on port ${PORT}`));