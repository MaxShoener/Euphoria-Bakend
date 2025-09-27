import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const browser = await chromium.launch({ headless:true });
const contexts = new Map(); // Map sessionID -> browser context

function getContext(sessionID) {
  if(!contexts.has(sessionID)){
    contexts.set(sessionID, browser.newContext({ storageState: undefined }));
  }
  return contexts.get(sessionID);
}

// Proxy for interactive browsing
app.get('/browse', async (req, res) => {
  const { url, session } = req.query;
  if(!url) return res.status(400).send('No URL provided');
  const sessionID = session || 'default';
  const context = await getContext(sessionID);
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    const content = await page.content();
    await page.close();
    res.send(content);
  } catch(err) {
    await page.close();
    res.status(500).send('Error loading page: ' + err.message);
  }
});

// Simple login endpoint
app.post('/login', async (req, res) => {
  const { username, password, session } = req.body;
  if(!username || !password) return res.status(400).json({ success:false });

  const sessionID = session || 'default';
  const context = await getContext(sessionID);
  const page = await context.newPage();

  try {
    // Replace with actual login logic for target sites
    await page.goto('https://example.com/login');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.close();
    res.json({ success:true, session:sessionID });
  } catch(err){
    await page.close();
    res.status(500).json({ success:false, message: err.message });
  }
});

// Remote play placeholder
app.get('/remote-play', async (req,res)=>{
  res.send('Remote play feature coming soon!');
});

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
