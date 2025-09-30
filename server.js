import express from 'express';
import fetch from 'node-fetch';
import { chromium } from 'playwright-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Serve static frontend (if any)
app.use(express.static(path.join(__dirname, 'public')));

// /browse endpoint: load a URL in headless Chromium and return HTML
app.get('/browse', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing ?url parameter');

  let browser;
  try {
    // Use system Chromium installed on Render
    browser = await chromium.launch({
      headless: true,
      executablePath: '/usr/bin/chromium-browser' // Render's system path
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const html = await page.content();
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading page');
  } finally {
    if (browser) await browser.close();
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
