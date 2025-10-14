// CommonJS server to avoid ESM/CJS interop headaches in containers.
//
// This server exposes:
//
//  - GET /health                -> basic health check
//  - GET /engine               -> returns current engine name
//  - POST /engine?engine=name  -> switch engine to 'ultraviolet' or 'scramjet'
//  - GET  /proxy?url=<target>  -> proxies GET requests to target URL and streams the response
//
// The server uses local engine modules in ./engines to avoid external
// git/tarball install issues while still providing two engine flavors.
// Engines must export: async function proxy(req, res, targetUrl)
//

const express = require('express');
const morgan = require('morgan');
const url = require('url');
const path = require('path');

const app = express();
app.use(morgan('tiny'));

// Load engine modules (local)
const uvEngine = require('./engines/uv-engine');
const scramjetEngine = require('./engines/scramjet-engine');

// Default engine
let engineName = process.env.PROXY_ENGINE && process.env.PROXY_ENGINE.toLowerCase() === 'scramjet'
  ? 'scramjet'
  : 'ultraviolet';

function getEngine() {
  return engineName === 'scramjet' ? scramjetEngine : uvEngine;
}

// Basic CORS for file:/// and other origins
app.use((req, res, next) => {
  // Allow any origin (file:// requests use origin null — using * avoids CORS blocking)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', engine: engineName }));

app.get('/engine', (req, res) => {
  res.json({ engine: engineName });
});

// Change engine via POST or GET for convenience: /engine?engine=scramjet
app.post('/engine', express.urlencoded({ extended: true }), (req, res) => {
  const candidate = (req.query.engine || req.body.engine || '').toLowerCase();
  if (candidate === 'ultraviolet' || candidate === 'scramjet') {
    engineName = candidate;
    return res.json({ engine: engineName, status: 'ok' });
  }
  res.status(400).json({ error: 'engine must be "ultraviolet" or "scramjet"' });
});

// Accept GET for convenience too (so file:/// frontend can use simple fetch)
app.get('/engine', (req, res) => {
  // If query contains ?set=XXX, set engine
  const set = (req.query.set || '').toLowerCase();
  if (set) {
    if (set === 'ultraviolet' || set === 'scramjet') {
      engineName = set;
      return res.json({ engine: engineName, status: 'ok' });
    }
    return res.status(400).json({ error: 'invalid engine' });
  }
  res.json({ engine: engineName });
});

// Main proxying endpoint
// GET /proxy?url=<encoded-target-url>
// Example: /proxy?url=https%3A%2F%2Fexample.com
app.get('/proxy', async (req, res) => {
  try {
    const target = req.query.url || req.query.u;
    if (!target) return res.status(400).json({ error: 'missing url parameter' });

    // Basic normalization and safety: allow http or https
    const parsed = url.parse(target);
    if (!parsed.protocol || !/^https?:$/.test(parsed.protocol)) {
      return res.status(400).json({ error: 'only http(s) target URLs are supported' });
    }

    const engine = getEngine();
    // engines export proxy(req, res, targetUrl)
    await engine.proxy(req, res, target);
    // engine should end the response itself
  } catch (err) {
    console.error('Proxy error', err && err.stack || err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'proxy_failed', message: String(err) });
    } else {
      // If headers already sent, attempt to end
      try { res.end(); } catch (e) {}
    }
  }
});

// Root help page (optional)
app.get('/', (req, res) => {
  res.type('text/plain').send(`Euphoria proxy backend
Available endpoints:
 - GET /health
 - GET /engine      -> see or set engine via ?set=ultraviolet or ?set=scramjet
 - POST /engine     -> switch (form param 'engine' or query)
 - GET /proxy?url=<target>
Current engine: ${engineName}
`);
});

// Start
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Euphoria backend listening on 0.0.0.0:${PORT} (engine=${engineName})`);
});