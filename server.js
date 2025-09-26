const express = require("express");
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

// Detect Render Chrome dynamically
let chromePath = null;
const chromeBasePath = "/opt/render/project/.chromium-browser";

if (fs.existsSync(chromeBasePath)) {
  const versions = fs.readdirSync(chromeBasePath);
  if (versions.length > 0) {
    chromePath = `${chromeBasePath}/${versions[0]}/chrome`;
    console.log("Detected Chrome binary at:", chromePath);
  }
}

if (!chromePath) {
  console.error("No Chrome binary found. Puppeteer will not work.");
}

app.get("/proxy", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing ?url=");

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
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
