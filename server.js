import express from "express";
import { chromium } from "playwright";
import { createProxyMiddleware } from "http-proxy-middleware";
import fetch from "node-fetch";
import cheerio from "cheerio";
import WebSocket, { WebSocketServer } from "ws";

const app = express();
const PORT = process.env.PORT || 10000;

let browser;

async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    console.log("Playwright browser initialized");
  }
}

app.get("/browse", async (req, res) => {
  await initBrowser();
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing url parameter");

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Grab page content
    const html = await page.content();
    await context.close();

    // Use Cheerio to rewrite URLs for proxy if needed
    const $ = cheerio.load(html);
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.startsWith("http")) {
        $(el).attr("href", `/browse?url=${encodeURIComponent(href)}`);
      }
    });

    res.send($.html());
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading page");
  }
});

// Basic WebSocket proxy
const wss = new WebSocketServer({ noServer: true });

app.server = app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

app.server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", (ws, req) => {
  console.log("WebSocket connected");
  ws.on("message", (msg) => {
    console.log("WS message:", msg.toString());
  });
});

