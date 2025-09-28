import express from 'express';
import { chromium } from 'playwright';
import cheerio from 'cheerio';
import WebSocket, { WebSocketServer } from 'ws';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// WebSocket server for frontend logins or session data
const wss = new WebSocketServer({ noServer: true });
wss.on('connection', (ws) => {
  ws.on('message', (msg) => console.log('WS message:', msg.toString()));
  ws.send('Connected to Euphoria backend WebSocket');
});

// Playwright browser pool
let browser;
(async () => {
  browser = await chromium.launch({ headless: true });
})();

app.get('/', async (req, res) => {
  res.send('Euphoria Backend Running');
});

app.get('/browse', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('No URL provided');

  try {
    // Proxy GET request using axios to avoid SSL mismatch
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const contentType = response.headers['content-type'] || 'text/html';
    res.setHeader('Content-Type', contentType);
    res.send(response.data);
  } catch (err) {
    console.error('Proxy GET error:', err.message);
    res.status(500).send('Error loading page');
  }
});

// Serve static frontend if needed
app.use('/static', express.static(path.join(__dirname, 'frontend')));

// Upgrade HTTP server for WebSocket
const server = app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
