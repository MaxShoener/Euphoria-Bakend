import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { chromium } from "playwright";
import cors from "cors";
import * as url from "url";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

// --- WebSocket proxy (for real-time content) ---
app.ws = (server) => {
  server.on("upgrade", (req, socket, head) => {
    const targetUrl = req.url.replace("/ws?url=", "");
    const target = decodeURIComponent(targetUrl);
    const proxy = createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
    });
    proxy.upgrade(req, socket, head);
  });
};

// --- Simple GET proxy for sites ---
app.get("/browse", async (req, res) => {
  const queryUrl = req.query.url;
  if (!queryUrl) return res.status(400).send("Missing URL parameter");

  try {
    // Headless browser fetch
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    // Go to URL
    await page.goto(queryUrl, { waitUntil: "networkidle" });

    // Get full HTML
    const content = await page.content();

    await browser.close();
    res.send(content);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading page");
  }
});

// --- Proxy for direct WebSocket connections ---
app.use(
  "/proxy",
  createProxyMiddleware({
    target: "https://www.google.com", // Default, can override with ?url=
    changeOrigin: true,
    secure: false,
    ws: true,
    pathRewrite: (path, req) => {
      const parsed = url.parse(req.url, true);
      if (parsed.query.url) return "/";
      return path;
    },
    router: (req) => {
      const parsed = url.parse(req.url, true);
      return parsed.query.url || "https://www.google.com";
    },
  })
);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
