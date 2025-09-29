import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Allow frontend to connect
app.use(cors({ origin: "*" }));

// ✅ Simple health check
app.get("/", (req, res) => {
  res.send("✅ Euphoria Backend is running");
});

/**
 * 🔹 Proxy middleware
 * Handles HTTPS sites, Google, Xbox, Microsoft login, etc.
 */
const proxy = createProxyMiddleware({
  changeOrigin: true,
  ws: true,
  secure: false, // disable strict cert checking (fixes altname mismatch)
  onProxyReq: (proxyReq, req) => {
    // Force Host header to match target site
    if (req.query.url) {
      try {
        const target = new URL(req.query.url);
        proxyReq.setHeader("host", target.host);
      } catch (err) {
        console.error("Invalid target URL:", req.query.url);
      }
    }
  },
  onError: (err, req, res) => {
    console.error("Proxy Error:", err.message);
    if (!res.headersSent) {
      res.status(502).send("Error loading page.");
    }
  },
});

// ✅ Handle browsing requests
app.get("/browse", (req, res, next) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send("Missing url query parameter");
  }

  try {
    const target = new URL(targetUrl);

    // Dynamically proxy to the requested target
    proxy({ target: target.origin })(req, res, next);
  } catch (err) {
    console.error("Invalid URL:", targetUrl);
    res.status(400).send("Invalid URL");
  }
});

// ✅ WebSocket proxying for live connections
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  console.log("New WebSocket connection");
  ws.on("message", (msg) => {
    console.log("WS message:", msg.toString());
  });
});

// ✅ Start server
server.listen(PORT, () => {
  console.log(`🚀 Euphoria backend running on port ${PORT}`);
});