import express from "express";
import fetch from "node-fetch";
import { load } from "cheerio"; // ✅ correct import for cheerio
import { createProxyServer } from "http-proxy";
import http from "http";
import { WebSocketServer } from "ws";
import url from "url";

const app = express();
const proxy = createProxyServer({});
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Simple route check ---
app.get("/", (req, res) => {
  res.send("✅ Euphoria backend is running");
});

// --- Proxy endpoint ---
app.get("/browse", async (req, res) => {
  try {
    let targetUrl = req.query.url;

    if (!targetUrl) {
      return res.status(400).send("❌ No URL provided");
    }

    // Add protocol if missing
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36",
      },
    });

    const contentType = response.headers.get("content-type");
    const buffer = await response.buffer();

    // If HTML, rewrite links to pass through proxy
    if (contentType && contentType.includes("text/html")) {
      const $ = load(buffer.toString());

      $("a").each((_, el) => {
        let href = $(el).attr("href");
        if (href && !href.startsWith("javascript:") && !href.startsWith("#")) {
          if (href.startsWith("/")) {
            href = new URL(href, targetUrl).href;
          }
          $(el).attr(
            "href",
            `/browse?url=${encodeURIComponent(href)}`
          );
        }
      });

      $("form").each((_, el) => {
        let action = $(el).attr("action");
        if (action && !action.startsWith("javascript:")) {
          if (action.startsWith("/")) {
            action = new URL(action, targetUrl).href;
          }
          $(el).attr(
            "action",
            `/browse?url=${encodeURIComponent(action)}`
          );
        }
      });

      res.set("content-type", "text/html");
      res.send($.html());
    } else {
      // Pass non-HTML directly (CSS, JS, images, etc.)
      res.set("content-type", contentType || "application/octet-stream");
      res.send(buffer);
    }
  } catch (err) {
    console.error("Proxy GET error:", err.message);
    res.status(500).send("❌ Error loading page");
  }
});

// --- WebSocket proxy ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (client, req) => {
  const params = new URLSearchParams(req.url.replace("/?", ""));
  const target = params.get("target");

  if (!target) {
    client.close();
    return;
  }

  const targetWs = new WebSocket(target);

  targetWs.on("open", () => {
    client.on("message", (msg) => targetWs.send(msg));
    targetWs.on("message", (msg) => client.send(msg));
  });

  targetWs.on("close", () => client.close());
  targetWs.on("error", () => client.close());
});

// --- Start server ---
server.listen(PORT, () => {
  console.log(`✅ Euphoria backend running on port ${PORT}`);
});