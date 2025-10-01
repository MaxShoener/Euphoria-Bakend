import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import fetch from "node-fetch"; // for non-HTML resources

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// Helper: strip CSP & framebusting headers
function stripHeaders(res) {
  res.removeHeader("content-security-policy");
  res.removeHeader("x-frame-options");
  res.removeHeader("cross-origin-opener-policy");
  res.removeHeader("cross-origin-embedder-policy");
  res.removeHeader("cross-origin-resource-policy");
}

// Universal proxy route
app.get("/proxy", async (req, res) => {
  let targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing ?url=");

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "https://" + targetUrl;
  }

  try {
    // First check content type
    const headResp = await fetch(targetUrl, { method: "HEAD" });
    const contentType = headResp.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      // === Playwright for HTML ===
      const browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(targetUrl, { waitUntil: "networkidle" });
      let content = await page.content();
      await browser.close();

      // Rewrite relative links to flow back through /proxy
      content = content.replace(
        / (href|src|action)=["'](?!https?:\/\/|data:|#)([^"']+)["']/gi,
        (match, attr, link) => {
          const absolute = new URL(link, targetUrl).href;
          return ` ${attr}="/proxy?url=${encodeURIComponent(absolute)}"`;
        }
      );

      // Add <base> to help resolve relative URLs
      content = content.replace(
        /<head.*?>/i,
        (match) =>
          `${match}<base href="/proxy?url=${encodeURIComponent(targetUrl)}">`
      );

      stripHeaders(res);
      res.set("content-type", "text/html");
      res.send(content);
    } else {
      // === Non-HTML resources (images, CSS, JS, fonts, etc.) ===
      const response = await fetch(targetUrl);
      stripHeaders(res);
      res.set(
        "content-type",
        response.headers.get("content-type") || "application/octet-stream"
      );
      response.body.pipe(res);
    }
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy failed: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Euphoria Playwright proxy running on port ${PORT}`);
});
