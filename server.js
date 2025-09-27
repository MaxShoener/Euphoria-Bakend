import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const app = express();
const PORT = process.env.PORT || 10000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let browser;
let context;
let page;

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({ headless: false }); // headless false allows full login flows
    context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    page = await context.newPage();
  }
}

// Endpoint to navigate & return screenshot
app.get('/stream', async (req, res) => {
  await initBrowser();
  const url = req.query.url || 'https://www.google.com';
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': screenshotBuffer.length
    });
    res.end(screenshotBuffer);
  } catch (err) {
    res.status(500).send('Error loading page: ' + err.message);
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));