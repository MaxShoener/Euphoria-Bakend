import express from "express";
import { chromium } from "playwright";

const app = express();
const PORT = process.env.PORT || 3000;

let browser;

// Try to start Chromium safely
async function initBrowser() {
  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    console.log("✅ Chromium launched successfully");
  } catch (err) {
    console.error("❌ Failed to launch Chromium:", err.message);
    console.log("⏳ Retrying in 10 seconds...");
    setTimeout(initBrowser, 10000);
  }
}

app.get("/", (req, res) => {
  res.send("🚀 Euphoria backend is running!");
});

app.get("/screenshot", async (req, res) => {
  if (!browser) return res.status(503).send("⚠️ Browser not ready yet.");

  try {
    const page = await browser.newPage();
    await page.goto("https://example.com");
    const screenshot = await page.screenshot();
    await page.close();

    res.type("png").send(screenshot);
  } catch (err) {
    console.error("❌ Error taking screenshot:", err.message);
    res.status(500).send("Internal server error");
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
  initBrowser();
});