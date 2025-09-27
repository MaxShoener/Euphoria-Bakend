import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

const app = express();
app.use(cors());
app.use(express.json());

let browser;

// Initialize the browser once
async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('Browser initialized');
  }
}

// Endpoint to browse a URL
app.get('/browse', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send('URL missing');
  }

  await initBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const content = await page.content();
    await context.close();
    res.send(content);
  } catch (err) {
    await context.close();
    res.status(500).send('Error loading page: ' + err.message);
  }
});

// Health check endpoint
app.get('/health', (req, res) => res.send('Backend running...'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
