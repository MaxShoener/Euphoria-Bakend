// server.js
import express from "express";
import fetch from "node-fetch";
import { chromium } from "playwright";

const app = express();
const PORT = process.env.PORT || 3000;

// Launch Chromium once for all requests
let browserPromise = chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

// Helper: encode proxied URL
function proxify(url) {
  return `/browse?url=${encodeURIComponent(url)}`;
}

// Helper: rewrite HTML to fix links, images, forms, and CSP
function rewriteHTML(html, targetURL) {
  let rewritten = html;

  // Fix <a href>
  rewritten = rewritten.replace(
    /href="(.*?)"/g,
    (match, href) => {
      if (href.startsWith("http")) {
        return `href="${proxify(href)}"`;
      } else if (href.startsWith("/") && !href.startsWith("//")) {
        return `href="${proxify(new URL(href, targetURL).href)}"`;
      }
      return match;
    }
  );

  // Fix <img src>, <script src>, etc.
  rewritten = rewritten.replace(
    /src="(.*?)"/g,
    (match, src) => {
      if (src.startsWith("http")) {
        return `src="${proxify(src)}"`;
      } else if (src.startsWith("/") && !src.startsWith("//")) {
        return `src="${proxify(new URL(src, targetURL).href)}"`;
      }
      return match;
    }
  );

  // Fix CSS url(...)
  rewritten = rewritten.replace(
    /url\(["']?(.*?)["']?\)/g,
    (match, url) => {
      if (url.startsWith("http")) {
        return `url(${proxify(url)})`;
      } else if (url.startsWith("/") && !url.startsWith("//")) {
        return `url(${proxify(new URL(url, targetURL).href)})`;
      }
      return match;
    }
  );

  // Fix <form action>
  rewritten = rewritten.replace(
    /action="(.*?)"/g,
    (match, action) => {
      if (action.startsWith("http")) {
        return `action="${proxify(action)}"`;
      } else if (action.startsWith("/") && !action.startsWith("//")) {
        return `action="${proxify(new URL(action, targetURL).href)}"`;
      }
      return match;
    }
  );

  // Remove framebusting headers/scripts
  rewritten = rewritten.replace(/X-Frame-Options/gi, "");
  rewritten = rewritten.replace(/Content-Security-Policy/gi, "");

  return rewritten;
}

app.get("/browse", async (req, res) => {
  const target = req.query.url;

  if (!target) {
    return res.status(400).send("Missing ?url=");
  }

  try {
    const browser = await browserPromise;
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      javaScriptEnabled: true
    });
    const page = await context.newPage();

    // Forward cookies if present
    if (req.headers.cookie) {
      const urlObj = new URL(target);
      await context.addCookies([
        {
          name: "cookie",
          value: req.headers.cookie,
          domain: urlObj.hostname,
          path: "/"
        }
      ]);
    }

    await page.goto(target, { waitUntil: "networkidle", timeout: 30000 });

    let content = await page.content();
    content = rewriteHTML(content, target);

    // Forward Set-Cookie headers
    const cookies = await context.cookies();
    if (cookies.length > 0) {
      res.setHeader(
        "Set-Cookie",
        cookies.map(
          (c) => `${c.name}=${c.value}; Domain=${c.domain}; Path=${c.path};`
        )
      );
    }

    res.setHeader("Content-Type", "text/html");
    res.send(content);

    await page.close();
    await context.close();
  } catch (err) {
    console.error("Browse error:", err);
    res.status(500).send("Error loading page: " + err.message);
  }
});

app.get("/", (req, res) => {
  res.send("✅ Euphoria backend running!");
});

app.listen(PORT, () =>
  console.log(`🚀 Backend running at http://localhost:${PORT}`)
);
