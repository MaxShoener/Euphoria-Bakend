// server.js
import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Serve the frontend
app.use(express.static(path.join(__dirname, "/")));

// --- Proxy route example ---
// Replace TARGET_URL with any backend service you want to proxy
const TARGET_URL = "https://example.com"; // Change if needed
app.use(
  "/proxy",
  createProxyMiddleware({
    target: TARGET_URL,
    changeOrigin: true,
    pathRewrite: { "^/proxy": "" }
  })
);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Euphoria backend running!" });
});

// Catch-all route to serve frontend for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Euphoria backend running on port ${PORT}`);
});
