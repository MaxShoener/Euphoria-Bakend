// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🔹 Basic fetch endpoint
app.get("/browse", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "Missing ?url=" });
    }

    const response = await fetch(url, {
      headers: { "User-Agent": req.headers["user-agent"] || "Mozilla/5.0" },
    });

    const contentType = response.headers.get("content-type");
    res.set("content-type", contentType);

    // Pass through body
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Proxy GET error:", err.message);
    res.status(500).json({ error: "Proxy failed", details: err.message });
  }
});

// 🔹 Full proxy route for logins, redirects, cookies, etc.
app.use(
  "/proxy",
  createProxyMiddleware({
    changeOrigin: true,
    secure: false,
    target: "http://dummy", // placeholder, will be dynamically set below
    router: (req) => {
      // Extract real target from query ?url=
      const url = new URL(req.url, "http://localhost");
      const target = url.searchParams.get("url");
      if (!target) {
        return "http://example.org";
      }
      return target;
    },
    pathRewrite: {
      "^/proxy": "",
    },
    ws: true,
    logLevel: "debug",
  })
);

// 🔹 Setup WebSocket server (proxy pass-through)
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  console.log("WebSocket client connected");

  // This is a simple passthrough, you might extend later
  ws.on("message", (message) => {
    console.log("Received WS message:", message.toString());
  });

  ws.on("close", () => console.log("WebSocket client disconnected"));
});

server.listen(PORT, () => {
  console.log(`✅ Euphoria backend running on port ${PORT}`);
});