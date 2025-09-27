import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { chromium } from 'playwright';  // Ensure Playwright is installed
import path from 'path';

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // for frontend static files

let browser;
let context;

async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    context = await browser.newContext({ ignoreHTTPSErrors: true });
  }
}

app.get('/browse', async (req, res) => {
  try {
    await initBrowser();
    const url = req.query.url;
    if (!url) return res.status(400).send('Missing URL');
    
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const content = await page.content();
    await page.close();
    
    res.send(content);
  } catch (err) {
    console.error('Error loading page:', err);
    res.status(500).send('Failed to load page');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
