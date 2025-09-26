import express from "express";
import cors from "cors";
import { chromium } from "playwright-core";

const app = express();
app.use(cors());
app.use(express.json());

// Replace with your Browserless.io WebSocket endpoint
const BROWSER_WS_ENDPOINT = "wss://chrome.browserless.io?token=YOUR_API_KEY";

// Simple logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Endpoint to load any URL and return a screenshot
app.post("/load", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL missing" });

  let browser;
  try {
    browser = await chromium.connectOverCDP(BROWSER_WS_ENDPOINT);
    const [page] = await browser.pages();

    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "networkidle" });

    // Capture screenshot (optional, can remove if not needed)
    const screenshot = await page.screenshot({ encoding: "base64" });

    await browser.close();
    res.json({ success: true, screenshot });
  } catch (err) {
    console.error("Error loading page:", err);
    if (browser) await browser.close();
    res.status(500).json({ error: "Failed to load page" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
