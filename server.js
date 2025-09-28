// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import { CookieJar } from "tough-cookie";
import { v4 as uuidv4 } from "uuid";
import cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 10000;
const SESSION_COOKIE_NAME = "EUPH_SESSION";
const SESSIONS = new Map(); // sessionId -> CookieJar

app.use(cors({
  origin: true,
  credentials: true
}));

// For proxying form bodies and arbitrary content we accept raw bodies
app.use(express.raw({ type: "*/*", limit: "10mb" }));

// Simple ping/wake endpoint
app.get("/ping", (req, res) => res.json({ ok: true }));

// Middleware: ensure session and cookie-jar exist
app.use((req, res, next) => {
  let sid = req.cookies?.[SESSION_COOKIE_NAME];
  // If cookie parser not present, parse manually from raw header
  if (!sid && req.headers.cookie) {
    const match = req.headers.cookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) sid = match[1];
  }
  if (!sid || !SESSIONS.has(sid)) {
    sid = uuidv4();
    SESSIONS.set(sid, new CookieJar());
    // set cookie (httpOnly=false so file:// frontend can read if needed)
    res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=${sid}; Path=/; SameSite=None; Secure`);
  }
  req.euphSessionId = sid;
  req.euphJar = SESSIONS.get(sid);
  next();
});

// Utility: get cookie header string for a url from a CookieJar
async function getCookieHeader(jar, url) {
  return new Promise((resolve, reject) => {
    jar.getCookieString(url, (err, cookieStr) => {
      if (err) reject(err);
      else resolve(cookieStr || "");
    });
  });
}

// Utility: store set-cookie headers into jar
async function storeSetCookieHeaders(jar, setCookieHeaders, url) {
  if (!setCookieHeaders) return;
  const headersArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  await Promise.all(headersArray.map(async (sc) => {
    return new Promise((resolve) => {
      jar.setCookie(sc, url, { ignoreError: true }, () => resolve());
    });
  }));
}

// Fetch with cookie jar maintained per session
async function fetchWithJar(url, req, options = {}) {
  const jar = req.euphJar;
  const cookieHeader = await getCookieHeader(jar, url);
  const headers = Object.assign({}, options.headers || {});
  if (cookieHeader) headers["cookie"] = cookieHeader;
  // set user agent if not provided
  if (!headers["user-agent"]) headers["user-agent"] = "Mozilla/5.0 (Euphoria Proxy)";
  const response = await fetch(url, Object.assign({}, options, { headers, redirect: "manual" }));
  // capture set-cookie
  const setCookie = response.headers.raw()["set-cookie"];
  if (setCookie) {
    await storeSetCookieHeaders(jar, setCookie, url);
  }
  return response;
}

// /browse -> fetch target HTML, rewrite resources to /resource, return modified HTML
app.get("/browse", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url parameter");

  try {
    const upstream = await fetchWithJar(target, req, { method: "GET" });

    // If upstream is a redirect (3xx) keep following via Location
    if (upstream.status >= 300 && upstream.status < 400) {
      const loc = upstream.headers.get("location");
      if (loc) {
        // follow redirect and update cookies
        const absolute = new URL(loc, target).href;
        return res.redirect(`/browse?url=${encodeURIComponent(absolute)}`);
      }
    }

    const contentType = upstream.headers.get("content-type") || "";
    // If not HTML, simply pipe through via /resource (user probably loaded a file)
    if (!contentType.includes("text/html")) {
      // Stream directly through resource proxy
      const body = await upstream.arrayBuffer();
      const buffer = Buffer.from(body);
      res.setHeader("Content-Type", contentType);
      // Remove frame blocking headers
      res.removeHeader("X-Frame-Options");
      res.setHeader("Content-Security-Policy", "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
      return res.end(buffer);
    }

    const text = await upstream.text();

    // Load HTML and rewrite resource links
    const $ = cheerio.load(text);

    // Helper to rewrite attribute to proxy endpoint
    function rewriteAttr(selector, attr) {
      $(selector).each((i, el) => {
        const $el = $(el);
        const val = $el.attr(attr);
        if (!val) return;
        // ignore javascript:, data: and fragment-only links
        if (/^\s*(javascript:|data:|#|mailto:)/i.test(val)) return;
        try {
          const absolute = new URL(val, target).href;
          $el.attr(attr, `/resource?url=${encodeURIComponent(absolute)}`);
        } catch (e) {
          // skip malformed
        }
      });
    }

    // Rewrite common resource attributes
    rewriteAttr("script", "src");
    rewriteAttr("link", "href");
    rewriteAttr("img", "src");
    rewriteAttr("iframe", "src");
    rewriteAttr("audio", "src");
    rewriteAttr("video", "src");
    rewriteAttr("source", "src");
    rewriteAttr("a", "href"); // links will be proxied so navigation stays inside
    // Rewrite form actions to POST to /submit (we'll pass through original method, body)
    $("form").each((i, form) => {
      const $f = $(form);
      const action = $f.attr("action") || target;
      try {
        const absolute = new URL(action, target).href;
        // change action to our submit endpoint and add data-original-action attribute
        $f.attr("action", `/submit?url=${encodeURIComponent(absolute)}`);
        // enforce method to POST for simplicity if original was POST; preserve GET otherwise
        // We'll forward method as the browser sends it to /submit.
      } catch (e) {
        // ignore
      }
    });

    // Remove frame-ancestors / X-Frame-Options / CSP meta tags that would block framing
    $("meta[http-equiv='Content-Security-Policy']").remove();
    $("meta[http-equiv='X-Content-Security-Policy']").remove();
    $("meta[http-equiv='X-Frame-Options']").remove();

    // Inject a small base tag so relative URLs in modified doc resolve via /resource proxy
    // But because we rewrite resource URLs to /resource already it's optional.
    // Also inject a small script to intercept window.location changes (so link clicks route to /browse)
    const interceptScript = `
      (function(){
        // convert relative navigation to proxied browse
        function proxifyHref(href) {
          try {
            if (!href) return;
            if (href.startsWith('javascript:') || href.startsWith('mailto:')) {
              return;
            }
            // absolute URL
            const absolute = new URL(href, location.href).href;
            // if same origin proxy, allow; otherwise navigate top window through euphoria
            if (window.top && window.top !== window) {
              window.top.location.href = '/browse?url=' + encodeURIComponent(absolute);
            } else {
              window.location.href = '/browse?url=' + encodeURIComponent(absolute);
            }
          } catch(e){}
        }
        document.addEventListener('click', function(e){
          const a = e.target.closest && e.target.closest('a');
          if (a && a.href) {
            e.preventDefault();
            proxifyHref(a.getAttribute('href'));
          }
        }, true);
      })();
    `;
    $("head").append(`<script>${interceptScript}</script>`);

    const final = $.html();

    // Return modified HTML. Remove CSP headers that block framing (we are returning HTML directly)
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
    return res.send(final);
  } catch (err) {
    console.error("browse error:", err);
    res.status(500).send("Failed to fetch page: " + String(err));
  }
});

// /resource -> fetch and stream any resource (CSS/JS/image) via the session jar
app.get("/resource", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url parameter");
  try {
    const upstream = await fetchWithJar(target, req, { method: "GET" });
    // copy content-type
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    // strip frame-blocking headers
    res.removeHeader("X-Frame-Options");
    res.setHeader("Content-Security-Policy", "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
    // stream buffer
    const arrayBuf = await upstream.arrayBuffer();
    res.end(Buffer.from(arrayBuf));
  } catch (err) {
    console.error("resource error:", err);
    res.status(500).send("Failed to fetch resource.");
  }
});

// /submit -> forward form submissions (POST/GET/etc) to target domain while preserving cookies
app.all("/submit", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url parameter");
  try {
    // forward method, headers (but not host), and body
    const method = req.method;
    const headers = {};
    // copy content-type if present
    if (req.headers["content-type"]) headers["content-type"] = req.headers["content-type"];
    // For body, we have raw buffer from express.raw
    const body = req.body && req.body.length ? req.body : undefined;

    const upstream = await fetchWithJar(target, req, { method, headers, body, redirect: "manual" });

    // If upstream redirects, follow by returning redirect response to client/browser, rewritten through /browse
    if (upstream.status >= 300 && upstream.status < 400) {
      const loc = upstream.headers.get("location");
      if (loc) {
        const absolute = new URL(loc, target).href;
        return res.redirect(`/browse?url=${encodeURIComponent(absolute)}`);
      }
    }

    // Otherwise stream response content back
    const contentType = upstream.headers.get("content-type") || "text/html";
    res.setHeader("Content-Type", contentType);
    const arrayBuf = await upstream.arrayBuffer();
    res.end(Buffer.from(arrayBuf));
  } catch (err) {
    console.error("submit error:", err);
    res.status(500).send("Form submit failed.");
  }
});

app.listen(PORT, () => {
  console.log(`Euphoria backend running on port ${PORT}`);
});
