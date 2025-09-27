import express from "express";
import { chromium } from "playwright";

const app = express();
const PORT = process.env.PORT || 3000;

let browser;

// --- Start browser at launch ---
async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    console.log("✅ Browser initialized");
  }
}
initBrowser().catch(err => console.error("❌ Browser init failed:", err));

// --- Health check ---
app.get("/", (req, res) => {
  res.send("✅ Euphoria backend is running");
});

// --- Screenshot endpoint ---
app.get("/screenshot", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).send("Missing ?q= parameter");
  if (!browser) return res.status(503).send("⚠️ Browser not ready yet.");

  try {
    const page = await browser.newPage();

    // Decide between URL or search
    let targetUrl;
    if (query.startsWith("http://") || query.startsWith("https://")) {
      targetUrl = query;
    } else if (query.includes(".")) {
      targetUrl = "http://" + query;
    } else {
      targetUrl = "https://www.google.com/search?q=" + encodeURIComponent(query);
    }

    console.log("🌐 Navigating to:", targetUrl);

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    const screenshot = await page.screenshot({ fullPage: true });
    await page.close();

    res.set("Content-Type", "image/png");
    res.send(screenshot);
  } catch (err) {
    console.error("❌ Screenshot error:", err);
    res.status(500).send("Failed to capture screenshot");
  }
});

// --- Graceful shutdown ---
process.on("SIGINT", async () => {
  if (browser) await browser.close();
  process.exit();
});

app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));