import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

let browser;

// Serve frontend
app.use(express.static(__dirname));

// Launch Chromium
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: undefined });
})();

// Proxy /browse requests
app.get('/browse', async (req, res) => {
  let url = req.query.url;
  if (!url) return res.status(400).send('Missing ?url=');

  try {
    // Decode URL from frontend
    url = decodeURIComponent(url);

    // Use Playwright to fetch content
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Rewrite links to go through proxy
    const content = await page.content();
    const proxiedContent = content.replace(
      /(?:href|src)="(https?:\/\/[^"]+)"/g,
      (match, p1) => {
        return match.replace(p1, `/browse?url=${encodeURIComponent(p1)}`);
      }
    );

    await page.close();
    res.send(proxiedContent);

  } catch (err) {
    console.error('Error loading page:', err);
    res.status(500).send('Error loading page');
  }
});

app.listen(PORT, () => console.log(`🚀 Backend running at http://localhost:${PORT}`));
