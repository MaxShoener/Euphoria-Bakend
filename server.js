// server.js
const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const mime = require('mime-types');
const pino = require('pino');
const pLimit = require('p-limit');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const puppeteer = require('puppeteer-core');
let browser = null;

// concurrency limit for page navigations
const NAV_LIMIT = parseInt(process.env.NAV_LIMIT || '3', 10);
const limit = pLimit(NAV_LIMIT);

const PORT = process.env.PORT || 3000;
const app = express();

// Basic CORS for frontend
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Utility: ensure browser launched
async function ensureBrowser() {
  if (browser) return browser;

  // If a CHROME_PATH env var is set, use it; else try to launch without executablePath (may download)
  const executablePath = process.env.CHROME_PATH || undefined;

  logger.info({ executablePath }, 'Launching Chromium');
  browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ],
    defaultViewport: { width: 1200, height: 900 },
  });

  // close browser on SIGTERM
  process.on('SIGTERM', async () => {
    try {
      await browser.close();
    } catch (e) {}
    process.exit(0);
  });

  return browser;
}

/**
 * Route: /browse?url=<target>
 * - Loads the page in puppeteer, waits networkidle2, returns modified HTML
 * - All src/href are rewritten to /_resource?url=<orig>
 */
app.get('/browse', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing ?url=');

  // limit concurrent navs
  limit(() => _handleBrowse(target, req, res)).catch(err => {
    logger.error(err, 'browse handler error');
    try { if (!res.headersSent) res.status(500).send('Internal error'); } catch (_) {}
  });
});

async function _handleBrowse(target, req, res) {
  const b = await ensureBrowser();
  const page = await b.newPage();

  // forward user headers optionally (e.g., cookie, user-agent)
  const forwardUA = req.headers['user-agent'];
  if (forwardUA) await page.setUserAgent(forwardUA);

  // Set reasonable timeouts
  await page.setDefaultNavigationTimeout(parseInt(process.env.NAV_TIMEOUT || '30000', 10));

  try {
    logger.info({ target }, 'Navigating');
    // go to site
    await page.goto(target, { waitUntil: 'networkidle2' });

    // get full HTML
    let html = await page.content();

    // rewrite resource URLs to proxy (images, scripts, links, css)
    const $ = cheerio.load(html, { decodeEntities: false });

    // helper to rewrite attributes
    const rewriteAttr = (sel, attr) => {
      $(sel).each((i, el) => {
        const $el = $(el);
        const v = $el.attr(attr);
        if (!v) return;
        // ignore data:, about:; keep absolute/relative
        if (v.startsWith('data:') || v.startsWith('about:') || v.startsWith('javascript:')) return;
        try {
          const absolute = new URL(v, target).toString();
          const proxied = `/ _resource?url=${encodeURIComponent(absolute)}`.replace('/ _resource', '/_resource');
          $el.attr(attr, proxied);
        } catch (e) {
          // ignore malformed urls
        }
      });
    };

    rewriteAttr('img', 'src');
    rewriteAttr('script', 'src');
    rewriteAttr('link[rel="stylesheet"]', 'href');
    rewriteAttr('source', 'src');
    rewriteAttr('iframe', 'src');
    rewriteAttr('a', 'href');

    // inject a small meta tag to help with CORS in embedded contexts
    $('head').prepend('<meta name="euphoria-proxy" content="proxied">');

    const out = $.html();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(out);
  } catch (err) {
    logger.error(err, 'Page load failed');
    if (!res.headersSent) res.status(500).send('Failed to load page');
  } finally {
    try { await page.close(); } catch (e) {}
  }
}

/**
 * Route: /_resource?url=<resourceUrl>
 * - Fetch resource (via node-fetch) and stream it back with correct content-type
 * - Forward allowed headers like cache-control
 * - Sets CORS allow-origin
 */
app.get('/_resource', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing ?url=');

  logger.info({ url }, 'Proxying resource');

  try {
    // fetch resource
    const response = await fetch(url, {
      headers: {
        // optionally forward some headers
        'User-Agent': req.headers['user-agent'] || 'Euphoria-Proxy'
      },
      // allow redirects
      redirect: 'follow'
    });

    // status code from origin
    res.status(response.status);

    // copy select headers
    const ct = response.headers.get('content-type') || mime.lookup(url) || 'application/octet-stream';
    res.setHeader('Content-Type', ct);
    const cacheControl = response.headers.get('cache-control');
    if (cacheControl) res.setHeader('Cache-Control', cacheControl);

    // CORS headers so the browser can use images/scripts loaded via proxy
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.setHeader('Vary', 'Origin');

    // stream
    const body = response.body;
    if (!body) {
      const text = await response.text();
      return res.send(text);
    }
    body.pipe(res);
  } catch (err) {
    logger.error(err, 'Resource fetch failed');
    if (!res.headersSent) res.status(502).send('Bad gateway');
  }
});

/**
 * Wildcard route for forwarding things like /auth/* that you want to proxy directly
 * Example usage: /forward?url=<target>
 * A more advanced version could accept path and method and proxy all headers/cookies.
 */
app.get('/forward', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing ?url=');

  logger.info({ url }, 'Forwarding request (simple GET proxy)');
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Euphoria-Proxy'
      },
      redirect: 'follow'
    });

    res.status(response.status);
    // copy headers (but not everything)
    const ct = response.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);

    // stream body
    const body = response.body;
    if (!body) {
      const text = await response.text();
      return res.send(text);
    }
    body.pipe(res);
  } catch (err) {
    logger.error(err, 'Forward failed');
    if (!res.headersSent) res.status(502).send('Bad gateway');
  }
});

// health
app.get('/_health', (req, res) => res.json({ ok: true }));

// start server and init browser lazily
app.listen(PORT, () => {
  logger.info(`Euphoria backend listening on ${PORT}`);
});