const express = require("express");
const fetch = require("node-fetch");
const { URL } = require("url");

const app = express();
const PORT = process.env.PORT || 3000;

// Basic rewrite function
function rewriteHtml(html, targetUrl) {
  // Rewrite relative links to absolute
  const base = new URL(targetUrl);
  return html
    .replace(/href="\//g, `href="${base.origin}/`)
    .replace(/src="\//g, `src="${base.origin}/`)
    .replace(/content="\//g, `content="${base.origin}/`);
}

// Proxy endpoint
app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) {
    return res.status(400).send("Missing ?url=");
  }

  try {
    const response = await fetch(target, {
      headers: { "User-Agent": req.headers["user-agent"] }
    });

    let text = await response.text();
    text = rewriteHtml(text, target);

    // Strip CSP headers
    res.set("Content-Security-Policy", "");
    res.set("X-Frame-Options", "ALLOWALL");

    res.send(text);
  } catch (err) {
    res.status(500).send(`Error fetching ${target}: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}`);
});
