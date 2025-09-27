import express from 'express';
import fetch from 'node-fetch';
import { chromium } from 'playwright';

const app = express();
const port = process.env.PORT || 10000;

let browser;

async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
}

app.get('/browse', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.send('No URL provided');

  try {
    await initBrowser();
    const page = await browser.newPage();
    await page.goto(target, { waitUntil: 'domcontentloaded' });

    const content = await page.content();
    await page.close();
    res.send(content);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
