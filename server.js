const express = require("express");
const fetch = require("node-fetch");
const { createProxyServer } = require("http-proxy");
const { createServer } = require("http");

const app = express();
const proxy = createProxyServer({});
const PORT = process.env.PORT || 3000;

// Proxy normal HTTP(S) requests
app.get("/proxy", async (req, res) => {
  let targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing url parameter");

  try {
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": req.headers["user-agent"] }
    });

    let contentType = response.headers.get("content-type") || "";
    res.set("content-type", contentType);

    if (contentType.includes("text/html")) {
      let text = await response.text();

      // 🔄 Rewrite form actions
      text = text.replace(/<form([^>]*)action="([^"]*)"/gi, (m, attrs, action) => {
        let newUrl = `/proxy?url=${encodeURIComponent(new URL(action, targetUrl).href)}`;
        return `<form${attrs}action="${newUrl}"`;
      });

      // 🔄 Rewrite links
      text = text.replace(/<a([^>]*)href="([^"]*)"/gi, (m, attrs, href) => {
        let newUrl = `/proxy?url=${encodeURIComponent(new URL(href, targetUrl).href)}`;
        return `<a${attrs}href="${newUrl}"`;
      });

      // 🔄 Rewrite scripts
      text = text.replace(/<script([^>]*)src="([^"]*)"/gi, (m, attrs, src) => {
        let newUrl = `/proxy?url=${encodeURIComponent(new URL(src, targetUrl).href)}`;
        return `<script${attrs}src="${newUrl}"`;
      });

      // 🔄 Rewrite WebSocket URLs
      text = text.replace(/\b(wss?:\/\/[^\s'"]+)/gi, (m, wsUrl) => {
        return `/proxy?url=${encodeURIComponent(wsUrl)}`;
      });

      res.send(text);
    } else {
      // Non-HTML (images, CSS, JS, etc.)
      const buffer = await response.buffer();
      res.send(buffer);
    }
  } catch (err) {
    res.status(500).send("Proxy error: " + err.message);
  }
});

// Create raw HTTP server to handle both HTTP + WebSockets
const server = createServer(app);

// WebSocket tunneling
server.on("upgrade", (req, socket, head) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const targetUrl = urlObj.searchParams.get("url");

  if (targetUrl && targetUrl.startsWith("ws")) {
    proxy.ws(req, socket, head, { target: targetUrl, changeOrigin: true });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
