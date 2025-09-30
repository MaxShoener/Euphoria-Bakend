import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.static(__dirname));

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Proxy route with HTML rewriting
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

    // Only rewrite HTML
    if (contentType.includes("text/html")) {
      let body = await response.text();

      // Fix relative URLs for links, scripts, images, CSS, forms
      body = body.replace(
        / (href|src|action)=["'](?!https?:\/\/|data:|#)([^"']+)["']/gi,
        (match, attr, link) => {
          const absolute = new URL(link, targetUrl).href;
          return ` ${attr}="/proxy?url=${encodeURIComponent(absolute)}"`;
        }
      );

      // Force <base> to help relative resolution
      body = body.replace(
        /<head.*?>/i,
        match =>
          `${match}<base href="/proxy?url=${encodeURIComponent(targetUrl)}">`
      );

      res.send(body);
    } else {
      // Stream non-HTML resources directly
      response.body.pipe(res);
    }
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy failed: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Euphoria backend running on port ${PORT}`);
});
