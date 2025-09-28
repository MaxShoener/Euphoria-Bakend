import express from 'express';
import { createProxyServer } from 'http-proxy';
import cors from 'cors';

const app = express();
const proxy = createProxyServer({ changeOrigin: true, ws: true, secure: true });

app.use(cors());

app.all('/browse', (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing URL');
  proxy.web(req, res, { target });
});

// WebSocket support for real-time connections and logins
import http from 'http';
const server = http.createServer(app);

server.on('upgrade', (req, socket, head) => {
  const target = new URL(req.url, 'http://localhost').searchParams.get('url');
  if (target) proxy.ws(req, socket, head, { target });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));