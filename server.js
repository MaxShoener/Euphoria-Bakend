import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { chromium } from 'playwright';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
console.log(`✅ Euphoria backend starting...`);

// Cache for Playwright browser
let browser;
async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

// ------------------ /browse route ------------------
app.get('/browse', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing url");

  try {
    const browser = await getBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    const content = await page.content();
    await context.close();
    res.send(content);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading page");
  }
});

// ------------------ /proxy route ------------------
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing url");

  try {
    const response = await fetch(targetUrl, { redirect: 'follow' });
    const text = await response.text();
    res.send(text);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching URL");
  }
});

// ------------------ WebSocket upgrade (optional) ------------------
app.ws = (path, handler) => {
  console.warn("WebSocket proxying setup skipped; add ws proxy logic if needed.");
};

// ------------------ root route ------------------
app.get('/', (req, res) => res.send("✅ Euphoria backend running!"));

app.listen(PORT, () => console.log(`✅ Backend listening on port ${PORT}`));