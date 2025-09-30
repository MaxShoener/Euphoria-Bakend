// server.js
const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const mime = require('mime-types');
const pino = require('pino');
const pLimit = require('p-limit');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// choose puppeteer or puppeteer-core depending on package.json
let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch (e) {
  puppeteer = require('puppeteer');
}

// optional redis for persistent cookie storage (recommended for multi-instance)
let redisClient = null;
if (process.env.REDIS_URL) {
  const IORedis = require('ioredis');
  redisClient = new IORedis(process.env.REDIS_URL);
  redisClient.on('error', (err) => logger.warn({ err }, 'Redis error'));
}

const PORT = process.env.PORT || 3000;
const NAV_LIMIT = parseInt(process.env.NAV_LIMIT || '3', 10);
const limit = pLimit(NAV_LIMIT);
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

let browser = null;

// Simple in-memory store for contexts & cookie metadata (works for single-instance)
// production: replace with Redis keyed by sessionId
const CONTEXTS = new Map(); // sessionId => { contextId, createdAt, lastUsed }
const COOKIE_NAMESPACE = 'euphoria:session:cookies:'; // redis key prefix

async function ensureBrowser() {
  if (browser) return browser;
  const executablePath = process.env.CHROME_PATH || undefined;
  logger.info({ executablePath }, 'launching chromium');
  browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ],
    defaultViewport: { width: 1200, height: 900 },
  });
  process.on('SIGTERM', async () => {
    try { await browser.close(); } catch (e) {}
    process.exit(0);
  });
  return browser;
}

// helper: load cookies for sessionId (redis or memory)
async function loadCookiesForSession(sessionId) {
  if (!sessionId) return null;
  if (redisClient) {
    try {
      const raw = await redisClient.get(COOKIE_NAMESPACE + sessionId);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      logger.warn({ err: e }, 'redis get cookies failed');
      return null;
    }
  } else {
    const entry = CONTEXTS.get(sessionId);
    return entry && entry.cookies ? entry.cookies : null;
  }
}
async function saveCookiesForSession(sessionId, cookies) {
  if (!sessionId) return;
  if (redisClient) {
    try {
      await redisClient.set(COOKIE_NAMESPACE + sessionId, JSON.stringify(cookies), 'EX', 60 * 60 * 24); // TTL 24h
    } catch (e) {
      logger.warn({ err: e }, 'redis save cookies failed');
    }
  } else {
    const entry = CONTEXTS.get(sessionId) || {};
    entry.cookies = cookies;
    entry.lastUsed = Date.now();
    CONTEXTS.set(sessionId, entry);
  }
}

// create or reuse a browser context mapped to sessionId
async function getContextForSession(sessionId) {
  const b = await ensureBrowser();
  if (!sessionId) {
    // anonymous — return a fresh incognito context and let GC close
    return await b.createIncognitoBrowserContext();
  }

  let ctxEntry = CONTEXTS.get(sessionId);
  if (ctxEntry && ctxEntry.context) {
    ctxEntry.lastUsed = Date.now();
    return ctxEntry.context;
  }

  // create new context and restore cookies if present
  const context = await b.createIncognitoBrowserContext();
  const cookies = await loadCookiesForSession(sessionId);
  if (cookies && cookies.length) {
    try {
      const page = await context.newPage();
      // navigate to a base origin for cookie scope: pick first cookie domain
      const cookieDomain = cookies[0].domain || cookies[0].name;
      // best-effort: open the cookie domain root so setCookie works
      try {
        await page.goto('https://' + (cookieDomain.replace(/^\./, '')), { waitUntil: 'domcontentloaded', timeout: 10000 });
      } catch (e) {
        // ignore navigation failure, we can still set cookies
      }
      await page.setCookie(...cookies);
      await page.close();
    } catch (e) {
      logger.warn({ err: e }, 'failed to restore cookies into context');
    }
  }

  ctxEntry = { context, createdAt: Date.now(), lastUsed: Date.now() };
  CONTEXTS.set(sessionId, ctxEntry);
  return context;
}

// endpoint: visit a page using optional sessionId query to reuse login state
app.get('/browse', async (req, res) => {
  const target = req.query.url;
  const sessionId = req.query.session; // optional session id passed from frontend
  if (!target) return res.status(400).send('Missing ?url=');

  limit(() => _handleBrowse(target, sessionId, req, res)).catch(err => {
    logger.error(err, 'browse handler error');
    if (!res.headersSent) res.status(500).send('Internal error');
  });
});

async function _handleBrowse(target, sessionId, req, res) {
  const context = await getContextForSession(sessionId);
  const page = await context.newPage();

  if (req.headers['user-agent']) await page.setUserAgent(req.headers['user-agent']);
  await page.setDefaultNavigationTimeout(parseInt(process.env.NAV_TIMEOUT || '30000', 10));

  try {
    logger.info({ target, sessionId }, 'navigating');
    await page.goto(target, { waitUntil: 'networkidle2' });

    // get HTML
    let html = await page.content();

    // rewrite resource URLs -> /_resource?url=<absolute>&session=<sessionId>
    const $ = cheerio.load(html, { decodeEntities: false });
    const rewriteAttr = (sel, attr) => {
      $(sel).each((i, el) => {
        const $el = $(el);
        const v = $el.attr(attr);
        if (!v) return;
        if (v.startsWith('data:') || v.startsWith('javascript:') || v.startsWith('about:')) return;
        try {
          const absolute = new URL(v, target).toString();
          let proxied = `/ _resource?url=${encodeURIComponent(absolute)}`.replace('/ _resource', '/_resource');
          if (sessionId) proxied += `&session=${encodeURIComponent(sessionId)}`;
          $el.attr(attr, proxied);
        } catch (e) {}
      });
    };
    rewriteAttr('img', 'src');
    rewriteAttr('script', 'src');
    rewriteAttr('link[rel="stylesheet"]', 'href');
    rewriteAttr('source', 'src');
    rewriteAttr('iframe', 'src');
    rewriteAttr('a', 'href');

    $('head').prepend('<meta name="euphoria-proxy" content="proxied">');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send($.html());
  } catch (err) {
    logger.error(err, 'page load failed');
    if (!res.headersSent) res.status(500).send('Failed to load page');
  } finally {
    try { await page.close(); } catch (e) {}
    // do not close context: it's kept for session reuse
  }
}

// resource proxy — optionally uses session header cookies for authenticated requests
app.get('/_resource', async (req, res) => {
  const url = req.query.url;
  const sessionId = req.query.session;
  if (!url) return res.status(400).send('Missing ?url=');

  logger.info({ url, sessionId }, 'proxying resource');

  try {
    // If a sessionId exists and cookies were saved, we can try to forward them as Cookie header
    let headers = { 'User-Agent': req.headers['user-agent'] || 'Euphoria-Proxy' };
    if (sessionId) {
      const cookies = await loadCookiesForSession(sessionId);
      if (cookies && cookies.length) {
        // convert cookie objects to header string:
        const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        headers.Cookie = cookieHeader;
      }
    }

    const response = await fetch(url, { headers, redirect: 'follow' });
    res.status(response.status);
    const ct = response.headers.get('content-type') || mime.lookup(url) || 'application/octet-stream';
    res.setHeader('Content-Type', ct);
    const cacheControl = response.headers.get('cache-control');
    if (cacheControl) res.setHeader('Cache-Control', cacheControl);

    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.setHeader('Vary', 'Origin');

    const body = response.body;
    if (!body) {
      const text = await response.text();
      return res.send(text);
    }
    body.pipe(res);
  } catch (err) {
    logger.error(err, 'resource fetch failed');
    if (!res.headersSent) res.status(502).send('Bad gateway');
  }
});

/**
 * Example: login simulation endpoint.
 * This demonstrates automating a login or any flow that produces cookies,
 * then saving those cookies to the session store for reuse.
 *
 * Body: { session: "<sessionId>", actions: { type: "goto", url: "..."} ... }
 * For demo we implement a simple goto + wait scenario, but you can script clicks/inputs.
 */
app.post('/login-simulate', async (req, res) => {
  const sessionId = req.body.session;
  const target = req.body.url;
  if (!sessionId || !target) return res.status(400).send('Missing session or url');

  try {
    const context = await getContextForSession(sessionId);
    const page = await context.newPage();
    await page.setDefaultNavigationTimeout(60000);

    // Example automation: go to target and wait for network idle
    await page.goto(target, { waitUntil: 'networkidle2' });

    // Optionally perform actions (fill forms) — user can expand this
    // e.g., await page.type('#username', 'user'); await page.type('#pass', 'pass'); await page.click('#login');

    // extract cookies and save
    const cookies = await page.cookies();
    await saveCookiesForSession(sessionId, cookies);

    await page.close();
    res.json({ ok: true, cookiesSaved: cookies.length });
  } catch (e) {
    logger.error(e, 'login-simulate failed');
    res.status(500).json({ ok: false, error: e.toString() });
  }
});

// simple forward endpoint to handle callbacks like /auth/* (returns raw origin content)
app.all('/forward', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing ?url=');

  try {
    const opts = {
      method: req.method,
      redirect: 'follow',
      headers: { 'user-agent': req.headers['user-agent'] || 'Euphoria-Proxy' },
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      opts.body = JSON.stringify(req.body);
      opts.headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(url, opts);
    res.status(response.status);
    const ct = response.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    const body = response.body;
    if (!body) return res.send(await response.text());
    body.pipe(res);
  } catch (e) {
    logger.error(e, 'forward failed');
    if (!res.headersSent) res.status(502).send('Bad gateway');
  }
});

app.get('/_health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => logger.info(`Euphoria backend listening on ${PORT}`));