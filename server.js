import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

let browser;

// Serve frontend
app.use(express.static(__dirname));

// Launch Chromium once
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: undefined });
})();

// Proxy /browse requests
app.get('/browse', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing ?url=');

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const content = await page.content();
    await page.close();
    res.send(content);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading page');
  }
});

app.listen(PORT, () => console.log(`🚀 Backend running at http://localhost:${PORT}`));
