import express from "express";
import fetch from "node-fetch";
import httpProxy from "http-proxy";
import { WebSocketServer } from "ws";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import { chromium } from "playwright";

const { createProxyServer } = httpProxy;
const app = express();
const PORT = process.env.PORT || 3000;

// --- Proxy setup ---
const proxy = createProxyServer({ changeOrigin: true, ws: true });

proxy.on("error", (err, req, res) => {
  console.error("Proxy error:", err.message);
  if (!res.headersSent) {
    res.writeHead(500, { "Content-Type": "text/plain" });
  }
  res.end("Proxy error: " + err.message);
});

// --- Proxy endpoint ---
app.get("/browse", async (req, res) => {
  try {
    let targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).send("Missing url param");
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://www.google.com/search?q=" + encodeURIComponent(targetUrl);
    }

    const response = await fetch(targetUrl, { redirect: "follow" });
    let html = await response.text();

    // Rewrite relative links to pass through proxy
    const $ = cheerio.load(html);
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href && !href.startsWith("http")) {
        $(el).attr("href", `/browse?url=${encodeURIComponent(new URL(href, targetUrl).href)}`);
      }
    });

    res.send($.html());
  } catch (err) {
    console.error("Proxy GET error:", err);
    res.status(500).send("Error loading page");
  }
});

// --- WebSocket proxy ---
const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
const wss = new WebSocketServer({ server });
wss.on("connection", (ws, req) => {
  console.log("WebSocket client connected");
  ws.on("message", msg => console.log("WS message:", msg.toString()));
});