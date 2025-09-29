// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple health check
app.get("/", (req, res) => {
  res.send("✅ Euphoria backend running!");
});

// Proxy example: /proxy -> https://www.google.com
app.use(
  "/proxy",
  createProxyMiddleware({
    target: "https://www.google.com",
    changeOrigin: true,
    pathRewrite: {
      "^/proxy": "",
    },
  })
);

// Example API endpoint
app.get("/api/fetch", async (req, res) => {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/todos/1");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed", details: err.message });
  }
});

// Catch-all for unknown routes
app.use((req, res) => {
  res.status(404).send("Cannot GET " + req.originalUrl);
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Euphoria backend running on port ${PORT}`);
});
