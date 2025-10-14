// Minimal "Ultraviolet-like" engine emulation (local).
// Purpose: demonstrate an engine that fetches and streams the response
// with a slight "Ultraviolet flavor" of header handling.
//
// This keeps everything local so Docker builds won't fail because of
// unreachable/private npm git sources.

const { pipeline } = require('stream');
const http = require('http');
const https = require('https');
const { URL } = require('url');

function copyHeaders(srcHeaders, targetRes) {
  // copy important headers but strip certain ones that break embedding
  for (const [k, v] of Object.entries(srcHeaders || {})) {
    const lc = k.toLowerCase();
    if (['content-security-policy', 'content-security-policy-report-only', 'x-frame-options'].includes(lc)) {
      // strip frame-blocking headers
      continue;
    }
    targetRes.setHeader(k, v);
  }
  // ensure CORS-friendly
  targetRes.setHeader('Access-Control-Allow-Origin', '*');
}

async function proxy(req, res, target) {
  // Use native http(s) request and pipe the response
  const parsed = new URL(target);

  const client = parsed.protocol === 'https:' ? https : http;

  const headers = Object.assign({}, req.headers);
  // override host header to target host
  headers.host = parsed.host;
  // remove accept-encoding to simplify streaming (avoid compressed bodies issues)
  delete headers['accept-encoding'];

  const options = {
    method: 'GET',
    headers,
    timeout: 20000,
  };

  const outgoing = client.request(parsed, options, (upstream) => {
    // copy status and headers
    res.statusCode = upstream.statusCode || 200;
    copyHeaders(upstream.headers, res);
    // stream upstream body to response
    pipeline(upstream, res, (err) => {
      if (err) console.warn('uv-engine pipeline error', err && err.stack || err);
    });
  });

  outgoing.on('error', (err) => {
    console.error('uv-engine request error', err);
    if (!res.headersSent) res.status(502).json({ error: 'upstream_request_failed', message: String(err) });
    else try { res.end(); } catch (e) {}
  });

  outgoing.end();
}

module.exports = { proxy };
