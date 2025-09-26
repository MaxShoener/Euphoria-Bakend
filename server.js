// server.js
import express from "express";
import cors from "cors";
import { chromium } from "playwright"; // playwright supports Chromium, Firefox, WebKit
import fetch from "node-fetch"; // optional, if needed for simple requests

const app = express();
app.use(cors());
app.use(express.json());

// Simple health check
app.get("/", (req, res) => res.send("Euphoria Proxy Server is running!"));

// Proxy endpoint
app.get("/proxy", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing URL parameter");

  let browser;
  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // required for Render.com
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }, // default viewport
    });

    const page = await context.newPage();

    // Handle errors gracefully
    page.on("pageerror", (err) => console.error("Page error:", err));
    page.on("requestfailed", (req) => console.error("Request failed:", req.url()));

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Get page content
    const content = await page.content();
    res.send(content);

  } catch (err) {
    console.error("Error loading page:", err);
    res.status(500).send("Failed to load URL");
  } finally {
    if (browser) await browser.close();
  }
});

// Listen on Render-compatible port
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Euphoria Proxy Server running on port ${port}`);
});
