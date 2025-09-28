import express from "express";
import fetch from "node-fetch";
import { createProxyMiddleware } from "http-proxy-middleware";
import { WebSocketServer } from "ws";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Proxy GET requests to bypass CORS & HTTPS issues
app.get("/browse", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing URL");

  try {
    const target = decodeURIComponent(url);

    // For Google search, use a proper User-Agent
    const headers = {
      "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
      Accept: "*/*",
    };

    const response = await fetch(target, { headers });
    const html = await response.text();

    res.send(html);
  } catch (err) {
    console.error("Proxy GET error:", err);
    res.status(500).send("Error loading page");
  }
});

// WebSocket server for live streaming / logins
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws) => {
  console.log("WebSocket connected");
  ws.on("message", (msg) => {
    console.log("WS message:", msg.toString());
    // handle login/session streaming
    ws.send(`Server received: ${msg}`);
  });
});

// Upgrade HTTP server for WebSockets
const server = app.listen(PORT, () =>
  console.log(`Backend running on port ${PORT}`)
);

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// Fallback route
app.use((req, res) => {
  res.status(404).send("Endpoint not found");
});
