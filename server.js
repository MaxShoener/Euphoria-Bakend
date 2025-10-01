/**
 * server.js
 * Scramjet + Ultraviolet proxy with streaming, header handling,
 * GET (iframe-friendly) and POST (ajax) endpoints.
 */

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fetch = require("node-fetch"); // v2 - returns node stream
const { StringStream } = require("scramjet");
const uv = require("ultraviolet");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // serve frontend index.html from /public

function sanitizeHeaders(upstreamHeaders) {
  // Return header object to apply to downstream response
  const out = {};
  upstreamHeaders.forEach((v, k) => {
    const name = k.toLowerCase();
    // Omit content-length (we will stream), and CSP/frame-ancestors to avoid blocking,
    // and security headers that may prevent embedding.
    if (["content-security-policy", "content-security-policy-report-only", "x-frame-options"].includes(name)) {
      return;
    }
    out[k] = v;
  });
  return out;
}

function isTextMime(contentType) {
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  return ct.startsWith("text/") || ct.includes("html") || ct.includes("javascript") || ct.includes("xml") || ct.includes("json");
}

/**
 * GET /proxy?url=<encodedUrl>&mode=<scramjet|uv>
 * - streams response so it can be used as iframe src
 */
app.get("/proxy", async (req, res) => {
  const encoded = req.query.url;
  const mode = (req.query.mode || "scramjet").toLowerCase();
  if (!encoded) return res.status(400).send("Missing url param");

  const targetUrl = decodeURIComponent(encoded);

  try {
    if (mode === "uv") {
      // ultraviolet mode returns full HTML string (convenient but synchronous from client POV)
      const html = await uv.proxy(targetUrl);
      // set some headers for HTML
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.send(html);
    }

    // scramjet mode (streaming)
    const upstream = await fetch(targetUrl, {
      // forward a reasonable UA
      headers: {
        "user-agent": req.get("user-agent") || "EuphoriaProxy/1.0",
        accept: req.get("accept") || "*/*",
        // you can forward more headers if you want (e.g. cookies) — BE CAREFUL
      },
      redirect: "follow",
      timeout: 30000
    });

    // status and sanitized headers
    res.statusCode = upstream.status;
    const safeHeaders = sanitizeHeaders(upstream.headers);
    Object.entries(safeHeaders).forEach(([k, v]) => res.setHeader(k, v));

    // Determine content type
    const contentType = upstream.headers.get("content-type") || "";

    if (isTextMime(contentType)) {
      // Insert a <base> tag pointing to origin to make relative URLs work.
      // We'll inject it into the first <head> tag encountered.
      let injected = false;
      let origin;
      try {
        const u = new URL(targetUrl);
        origin = u.origin + u.pathname.replace(/\/[^/]*$/, "/");
      } catch (err) {
        origin = targetUrl;
      }

      // Stream text through scramjet StringStream to transform first chunk
      StringStream.from(upstream.body)
        .map(async chunk => {
          // chunk is Buffer or string
          if (!injected) {
            injected = true;
            let str = chunk.toString("utf8");
            if (/\<head[^\>]*\>/i.test(str)) {
              // inject base after <head...>
              str = str.replace(/(\<head[^\>]*\>)/i, `$1<base href="${origin}">`);
            } else if (/\<\/head\>/i.test(str)) {
              // if head closed (unlikely), inject before close
              str = str.replace(/\<\/head\>/i, `<base href="${origin}"></head>`);
            } else {
              // fallback: place base at start
              str = `<base href="${origin}">` + str;
            }
            return str;
          }
          return chunk.toString("utf8");
        })
        .setEncoding("utf8")
        .pipe(res)
        .catch(err => {
          console.error("Stream error:", err);
          // if pipe already ended, cannot modify response — best effort
          if (!res.headersSent) res.status(500).send("Proxy stream error");
        });

    } else {
      // Binary or streaming resource — pipe directly
      // upstream.body is Node stream (from node-fetch v2)
      upstream.body.pipe(res).on("error", err => {
        console.error("Pipe error:", err);
        if (!res.headersSent) res.status(500).send("Proxy pipe error");
      });
    }

  } catch (err) {
    console.error("Proxy error:", err);
    if (!res.headersSent) res.status(500).send("Proxy failed: " + (err.message || err));
  }
});

/**
 * POST /proxy
 * Accepts JSON: { url: "...", mode: "scramjet"|"uv" }
 * Returns HTML/text result (used by JS fetch if you prefer).
 */
app.post("/proxy", async (req, res) => {
  const { url, mode = "scramjet" } = req.body || {};
  if (!url) return res.status(400).send("Missing url in POST body");

  try {
    if (mode === "uv") {
      const html = await uv.proxy(url);
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.send(html);
    }

    // For POST mode we will fetch the text and return it (not streaming)
    const upstream = await fetch(url, {
      headers: {
        "user-agent": req.get("user-agent") || "EuphoriaProxy/1.0",
        accept: req.get("accept") || "*/*",
      },
      redirect: "follow",
      timeout: 30000
    });

    const contentType = upstream.headers.get("content-type") || "";
    const safeHeaders = sanitizeHeaders(upstream.headers);
    Object.entries(safeHeaders).forEach(([k, v]) => res.setHeader(k, v));

    if (isTextMime(contentType)) {
      // inject base tag quickly by string replace on whole body (since POST use-case tends to be smaller)
      let text = await upstream.text();
      let origin;
      try {
        const u = new URL(url);
        origin = u.origin + u.pathname.replace(/\/[^/]*$/, "/");
      } catch (err) {
        origin = url;
      }
      if (/\<head[^\>]*\>/i.test(text)) {
        text = text.replace(/(\<head[^\>]*\>)/i, `$1<base href="${origin}">`);
      } else {
        text = `<base href="${origin}">` + text;
      }
      res.setHeader("content-type", contentType);
      return res.send(text);
    } else {
      // binary fallback: stream to client
      upstream.body.pipe(res).on("error", err => {
        console.error("Pipe error:", err);
        if (!res.headersSent) res.status(500).send("Proxy pipe error");
      });
    }
  } catch (err) {
    console.error("Proxy failed (POST):", err);
    res.status(500).send("Proxy failed: " + (err.message || err));
  }
});

// Health
app.get("/health", (req, res) => res.json({ ok: true }));

// Start server
app.listen(PORT, () => console.log(`Euphoria proxy (scramjet/uv) running on :${PORT}`));