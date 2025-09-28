import express from "express";
import cors from "cors";
import pkg from "http-proxy";
const { createProxyServer } = pkg;
import { chromium } from "playwright";

const app = express();
const proxy = createProxyServer({});
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

let browser;

async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    console.log("Playwright browser launched.");
  }
}

// Proxy GET requests (for external sites)
app.get("/browse", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing URL");

  try {
    await initBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const html = await page.content();
    await context.close();

    res.send(html);
  } catch (err) {
    console.error("Error loading page:", err);
    res.status(500).send("Error loading page");
  }
});

// WebSocket proxying example
app.all("/ws-proxy/*", (req, res) => {
  proxy.web(req, res, { target: "ws://example.com", changeOrigin: true }, (err) => {
    console.error("WebSocket proxy error:", err);
  });
});

// General HTTP proxy (optional, for requests like Xbox login)
app.all("/proxy/*", (req, res) => {
  const target = req.url.replace(/^\/proxy\//, "https://");
  proxy.web(req, res, { target, changeOrigin: true }, (err) => {
    console.error("Proxy GET error:", err);
    res.status(502).send("Proxy error");
  });
});

app.listen(PORT, () => {
  console.log(`Euphoria backend running on port ${PORT}`);
});