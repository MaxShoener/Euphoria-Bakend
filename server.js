const express = require("express");
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

// Try to detect Chrome executable automatically
function getChromePath() {
  const candidates = [
    "/opt/google/chrome/chrome", // standard path (may not exist)
    "/usr/bin/google-chrome",    // common Linux path
    "/usr/bin/chromium-browser", // common Linux path
    "/opt/render/project/.chromium-browser/linux-121.0.6167.85/chrome", // Render prebuilt
    "/opt/render/project/.chromium-browser/linux-*/chrome", // wildcard version
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  console.warn("Chrome executable not found, Puppeteer may fail");
  return null;
}

const chromePath = getChromePath();

app.get("/proxy", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing ?url=");

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2" });
    const html = await page.content();

    res.set("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    res.status(500).send(`Error loading ${url}: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`Headless proxy running on port ${PORT}`));
