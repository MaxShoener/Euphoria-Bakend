// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";  // <-- Playwright added

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.static(__dirname));

// Frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* =====================================================
   SAFE PROXY (v1.0.0)
   ===================================================== */
app.get("/proxy", async (req, res) => {
  let targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing ?url=");

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "https://" + targetUrl;
  }

  try {
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Euphoria Browser)" }
    });

    const contentType = response.headers.get("content-type") || "text/html";
    res.set("content-type", contentType);

    if (contentType.includes("text/html")) {
      let body = await response.text();

      // Rewrite relative URLs
      body = body.replace(
        / (href|src|action)=["'](?!https?:\/\/|data:|#)([^"']+)["']/gi,
        (match, attr, link) => {
          const absolute = new URL(link, targetUrl).href;
          return ` ${attr}="/proxy?url=${encodeURIComponent(absolute)}"`;
        }
      );

      // Force base
      body = body.replace(
        /<head.*?>/i,
        (match) =>
          `${match}<base href="/proxy?url=${encodeURIComponent(targetUrl)}">`
      );

      res.removeHeader("content-security-policy");
      res.send(body);
    } else {
      response.body.pipe(res);
    }
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy failed: " + err.message);
  }
});

/* =====================================================
   PLAYWRIGHT PROXY (JS-heavy sites, logins, YouTube, etc.)
   ===================================================== */
app.get("/proxy-playwright", async (req, res) => {
  let targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing ?url=");

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "https://" + targetUrl;
  }

  try {
    const browser = await chromium.launch({
      args: ["--no-sandbox"],
      headless: true
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(targetUrl, { waitUntil: "networkidle" });

    // Extract final HTML after scripts run
    const content = await page.content();

    await browser.close();

    res.set("content-type", "text/html");
    res.send(content);
  } catch (err) {
    console.error("Playwright error:", err);
    res.status(500).send("Playwright proxy failed: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Euphoria backend running on port ${PORT}`);
});
