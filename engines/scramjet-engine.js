// Minimal "Scramjet-like" engine emulation (local).
// Purpose: provide an alternate proxy behavior (slightly different header handling
// and an artificial transform step) so that parties can switch engines at runtime.

const { pipeline, Transform } = require('stream');
const http = require('http');
const https = require('https');
const { URL } = require('url');

function copyHeaders(srcHeaders, targetRes) {
  for (const [k, v] of Object.entries(srcHeaders || {})) {
    const lc = k.toLowerCase();
    if (['content-security-policy', 'x-frame-options'].includes(lc)) continue;
    targetRes.setHeader(k, v);
  }
  targetRes.setHeader('Access-Control-Allow-Origin', '*');
}

// a small pass-through transform that can inspect/modify chunks if needed
class SmallTransform extends Transform {
  constructor() { super(); }
  _transform(chunk, enc, cb) {
    // Keep it simple: pass chunks unchanged.
    // In real scramjet you'd do stream transforms here.
    this.push(chunk);
    cb();
  }
}

async function proxy(req, res, target) {
  const parsed = new URL(target);
  const client = parsed.protocol === 'https:' ? https : http;

  const headers = Object.assign({}, req.headers);
  headers.host = parsed.host;
  delete headers['accept-encoding'];

  const options = { method: 'GET', headers, timeout: 20000 };

  const outgoing = client.request(parsed, options, (upstream) => {
    res.statusCode = upstream.statusCode || 200;
    copyHeaders(upstream.headers, res);

    // insert transform for scramjet flavor
    const xform = new SmallTransform();
    pipeline(upstream, xform, res, (err) => {
      if (err) console.warn('scramjet-engine pipeline error', err && err.stack || err);
    });
  });

  outgoing.on('error', (err) => {
    console.error('scramjet-engine request error', err);
    if (!res.headersSent) res.status(502).json({ error: 'upstream_request_failed', message: String(err) });
    else try { res.end(); } catch (e) {}
  });

  outgoing.end();
}

module.exports = { proxy };
