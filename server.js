import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

const app = express();
app.use(cors());
app.use(express.json());

let browser;

async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
}

app.get('/browse', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('URL missing');

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

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running...');
});
