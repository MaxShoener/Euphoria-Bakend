import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));

// ✅ Health check
app.get("/", (req, res) => {
  res.send("✅ Euphoria Backend is running");
});

/**
 * 🔹 Dynamic proxy route
 */
app.use("/browse", (req, res, next) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send("Missing url query parameter");
  }

  try {
    const target = new URL(targetUrl);

    // Create proxy on the fly with correct target
    return createProxyMiddleware({
      target: target.origin,
      changeOrigin: true,
      ws: true,
      secure: false, // avoid TLS altname mismatch
      pathRewrite: {
        "^/browse": "" // forward everything after /browse
      },
      onProxyReq: (proxyReq) => {
        proxyReq.setHeader("host", target.host);
      },
      onError: (err, req, res) => {
        console.error("Proxy Error:", err.message);
        if (!res.headersSent) {
          res.status(502).send("Error loading page.");
        }
      }
    })(req, res, next);
  } catch (err) {
    console.error("Invalid URL:", targetUrl);
    res.status(400).send("Invalid URL");
  }
});

// ✅ WebSocket support
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");
  ws.on("message", (msg) => {
    console.log("WS message:", msg.toString());
  });
});

// ✅ Start server
server.listen(PORT, () => {
  console.log(`🚀 Euphoria backend running on port ${PORT}`);
});