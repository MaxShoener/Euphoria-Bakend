import express from "express";
import * as cheerio from "cheerio";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

// Health check
app.get("/", (req, res) => res.send("✅ Euphoria backend running!"));

// Browse endpoint
app.get("/browse", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing url parameter.");
  res.redirect(targetUrl);
});

// Proxy endpoint
app.use(
  "/proxy",
  createProxyMiddleware({
    changeOrigin: true,
    secure: true,
    selfHandleResponse: false,
    router: (req) => {
      const url = new URL(req.url, "http://localhost");
      return url.searchParams.get("url") || "https://www.google.com";
    },
    pathRewrite: (path, req) => {
      const url = new URL(req.url, "http://localhost");
      const target = url.searchParams.get("url");
      return target ? new URL(target).pathname + new URL(target).search : "/";
    },
    onProxyReq: (proxyReq, req) => {
      if (req.headers.cookie) proxyReq.setHeader("cookie", req.headers.cookie);
    },
  })
);

app.listen(PORT, () => console.log(`✅ Euphoria backend running on port ${PORT}`));