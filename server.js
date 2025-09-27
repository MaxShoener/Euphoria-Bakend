// server.js
import express from 'express';
import { chromium } from 'playwright';
import bodyParser from 'body-parser';
import cors from 'cors';

const app = express();
app.use(bodyParser.json());
app.use(cors());

let browser; 
let context;

async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: false, // headful mode for JS-heavy sites and login
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-fake-ui-for-media-stream', // for WebRTC test mode
        '--use-fake-device-for-media-stream'
      ]
    });
    context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: null });
  }
}

// Endpoint to browse a site
app.post('/browse', async (req, res) => {
  await initBrowser();
  const { url } = req.body;
  const page = await context.newPage();
  try {
    const visitUrl = url?.startsWith('http') ? url : `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    await page.goto(visitUrl, { waitUntil: 'domcontentloaded' });

    const content = await page.content();
    res.send(content);
  } catch (err) {
    res.status(500).send(`Failed to load page: ${err.message}`);
  } finally {
    await page.close();
  }
});

// Special streaming endpoint (Xbox Remote Play fallback)
app.get('/stream', (req, res) => {
  res.send('Xbox Remote Play / WebRTC not supported on Render. Use VPS/local server with GPU for streaming.');
});

app.listen(3000, () => {
  console.log('Euphoria backend running on port 3000');
});
