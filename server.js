import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Full proxy
app.get('/proxy', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing URL');

  try {
    const response = await fetch(target, {
      headers: { 'User-Agent': 'Euphoria/1.0' }
    });

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      // Rewrite HTML
      const text = await response.text();
      const dom = new JSDOM(text);
      const document = dom.window.document;

      // Rewrite scripts, links, imgs
      ['script', 'link', 'img', 'iframe'].forEach(tag => {
        document.querySelectorAll(tag).forEach(el => {
          if (el.tagName === 'LINK' && el.rel !== 'stylesheet') return;
          const attr = el.tagName === 'LINK' ? 'href' : 'src';
          if (el[attr]) {
            const absoluteUrl = new URL(el[attr], target).href;
            el[attr] = `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
          }
        });
      });

      res.set('Content-Type', 'text/html');
      res.send(dom.serialize());
    } else {
      // Binary resources (images, fonts, scripts)
      const buffer = await response.arrayBuffer();
      res.set('Content-Type', contentType);
      res.send(Buffer.from(buffer));
    }
  } catch (err) {
    res.status(500).send(`Proxy error: ${err.message}`);
  }
});

app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Euphoria running on port ${PORT}`));
