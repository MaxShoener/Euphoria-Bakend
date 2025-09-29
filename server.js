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
app.use(express.static(path.join(__dirname)));

// Serve the frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Proxy any requested URL
app.use("/proxy", createProxyMiddleware({
  target: "https://www.google.com",
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Forward the `url` query parameter
    const url = req.query.url || "https://www.google.com";
    return url.replace(/^https?:\/\//, "");
  },
  router: (req) => {
    return req.query.url || "https://www.google.com";
  }
}));

app.listen(PORT, () => {
  console.log(`✅ Euphoria backend running on port ${PORT}`);
});
