// server.js
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { chromium } from 'playwright';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const PORT = process.env.PORT || 3000;

// store sessions: sessionId -> {context, page, ws}
const sessions = new Map();

// create a new browser instance globally
let browser;
async function initBrowser(){
  if(browser) return;
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  console.log('Playwright browser launched');
}
await initBrowser();

// helper: create or return session
async function createSession(sessionId){
  if(!sessionId) sessionId = String(Date.now()) + Math.random().toString(36).slice(2,8);
  if(sessions.has(sessionId)) return sessions.get(sessionId);

  const context = await browser.newContext();
  const page = await context.newPage();
  // default size
  await page.setViewportSize({ width: 1280, height: 720 });

  const obj = { sessionId, context, page, ws: null, streaming: false };
  sessions.set(sessionId, obj);
  return obj;
}

// HTTP endpoint to create a session (returns {session})
app.post('/session', async (req, res) => {
  const { session } = req.query;
  const s = await createSession(session);
  res.json({ session: s.sessionId });
});

// HTTP proxy browse (fallback): returns HTML (not used by streaming)
app.get('/browse', async (req, res) => {
  const url = req.query.url;
  if(!url) return res.status(400).send('missing url');
  try{
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    const html = await page.content();
    await page.close(); await ctx.close();
    res.set('Content-Type','text/html').send(html);
  } catch(err){
    res.status(500).send('Error: '+ err.message);
  }
});

// On upgrade, handle ws and tie to session
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const sessionId = url.searchParams.get('session') || null;
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, sessionId);
  });
});

wss.on('connection', async (ws, sessionQuery) => {
  const sessionId = sessionQuery || String(Date.now()) + Math.random().toString(36).slice(2,8);
  const sess = await createSession(sessionId);
  sess.ws = ws;
  sess.streaming = true;

  const page = sess.page;
  console.log('ws connected for session', sessionId);

  // send initial size and ready
  ws.send(JSON.stringify({ type: 'size', w: page.viewportSize().width, h: page.viewportSize().height }));
  ws.send(JSON.stringify({ type: 'ready', session: sessionId }));

  // periodical screenshot streamer
  let streaming = true;
  (async function streamLoop(){
    try{
      while(streaming && ws.readyState === ws.OPEN){
        const buffer = await page.screenshot({ type: 'jpeg', quality: 60, fullPage: false });
        if(ws.readyState === ws.OPEN) ws.send(buffer);
        // tune delay for desired FPS
        await new Promise(r => setTimeout(r, 150)); // ~6-7 FPS
      }
    }catch(e){
      console.error('stream error', e);
    }
  })();

  // page console relay (optional)
  page.on('console', msg => {
    if(ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type:'log', msg: msg.text() }));
  });

  // handle incoming messages: JSON commands
  ws.on('message', async (data) => {
    // expecting JSON text messages only for control events
    try{
      const obj = JSON.parse(data.toString());
      if(obj.type === 'command'){
        if(obj.cmd === 'goto' && obj.url){
          await page.goto(obj.url, { waitUntil: 'networkidle' });
        } else if(obj.cmd === 'back'){
          await page.goBack();
        } else if(obj.cmd === 'forward'){
          await page.goForward();
        } else if(obj.cmd === 'reload'){
          await page.reload({ waitUntil: 'networkidle' });
        }
      } else if(obj.type === 'mouse'){
        // actions: down/up/move ; button default 0
        const bx = Math.round(obj.x);
        const by = Math.round(obj.y);
        if(obj.action === 'down'){
          await page.mouse.move(bx, by);
          await page.mouse.down({ button: ['left','middle','right'][obj.button] || 'left' });
        } else if(obj.action === 'up'){
          await page.mouse.move(bx, by);
          await page.mouse.up({ button: ['left','middle','right'][obj.button] || 'left' });
        } else if(obj.action === 'move'){
          await page.mouse.move(bx, by);
        }
      } else if(obj.type === 'keyboard'){
        // key down/up
        if(obj.action === 'down'){
          await page.keyboard.down(obj.key);
        } else if(obj.action === 'up'){
          await page.keyboard.up(obj.key);
        }
      } else if(obj.type === 'wheel'){
        // page.mouse.wheel is not implemented in Playwright; approximate by page.evaluate scroll
        await page.evaluate((dy) => { window.scrollBy(0, dy); }, obj.deltaY || 0);
      }
    }catch(err){
      console.error('ws msg parse/exec err', err);
    }
  });

  ws.on('close', async () => {
    console.log('ws closed for session', sessionId);
    streaming = false;
    sess.streaming = false;
    // keep the session for a short while, close context later if desired
    setTimeout(async ()=>{
      if(!sess.streaming){
        try{ await sess.page.close(); await sess.context.close(); sessions.delete(sessionId); }catch(e){}
      }
    }, 30_000); // 30s idle cleanup
  });
});

server.listen(PORT, () => console.log(`Euphoria streaming server listening on ${PORT}`));