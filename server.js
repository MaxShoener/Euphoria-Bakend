const express = require("express");
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

// Detect Chrome binary installed on Render
let chromePath = null;
const basePath = "/opt/render/project/.chromium-browser";

if (fs.existsSync(basePath)) {
  const versions = fs.readdirSync(basePath);
  if (versions.length > 0) {
    chromePath = `${basePath}/${versions[0]}/chrome`;
    console.log("Detected Chrome at:", chromePath);
  }
}

if (!chromePath) {
  console.error("No Chrome binary found. Puppeteer cannot launch!");
}

app.get("/proxy", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing ?url=");

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,           // <-- Must specify executablePath
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
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
