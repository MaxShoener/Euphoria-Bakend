import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

const app = express();
app.use(cors());
app.use(express.json());

// Helper: ensure URL is valid or fallback to search
function formatURL(input) {
  if (!input) return 'https://www.google.com';
  if (/^https?:\/\//i.test(input)) return input;
  return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
}

// Cache browser instance (optional)
let browser;

async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browser;
}

// Main /browse route
app.get('/browse', async (req, res) => {
  const url = formatURL(req.query.url);
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const content = await page.content();
    res.send(content);
    await page.close();
  } catch (err) {
    console.error('Failed to load page:', err);
    res.status(500).send(`Error loading page: ${err.message}`);
  }
});

// Optional: navigation buttons route for frontend iframe
app.get('/navigate', (req, res) => {
  res.send(`
    <button onclick="history.back()">⬅ Back</button>
    <button onclick="history.forward()">➡ Forward</button>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
