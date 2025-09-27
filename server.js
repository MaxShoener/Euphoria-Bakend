import express from "express";
import { chromium } from "playwright";

const app = express();
const PORT = process.env.PORT || 3000;

let browser;

async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

app.get("/browse", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing URL");

  try {
    const b = await initBrowser();
    const context = await b.newContext();
    const page = await context.newPage();
    await page.goto(target, { waitUntil: "domcontentloaded" });
    const content = await page.content();
    await context.close();
    res.send(content);
  } catch (err) {
    console.error("Browse error:", err);
    res.status(500).send("Failed to load page");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Euphoria backend running on port ${PORT}`);
});