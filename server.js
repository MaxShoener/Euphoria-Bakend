import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

const app = express();
app.use(cors());
app.use(express.json());

const browser = await chromium.launch({ headless: true });
const sessions = new Map(); // sessionId -> context

// Browse route
app.get('/browse', async (req, res) => {
  let { url, session } = req.query;

  if (!session) session = 'default';

  // If user didn't type a proper URL, treat it as a search query
  if (!url.startsWith('http')) {
    url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
  }

  // Create or reuse context
  let context;
  if (sessions.has(session)) {
    context = sessions.get(session);
  } else {
    context = await browser.newContext();
    sessions.set(session, context);
  }

  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const content = await page.content();
    res.send(content);
  } catch (err) {
    res.status(500).send(`Failed to load page: ${err.message}`);
  } finally {
    await page.close();
  }
});

app.listen(3000, () => console.log('Euphoria backend running on port 3000'));
