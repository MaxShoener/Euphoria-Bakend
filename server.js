const express = require("express");
const puppeteer = require("puppeteer-core");
const app = express();
const PORT = process.env.PORT || 3000;

// Path to Render's prebuilt Chrome
const CHROME_PATH = "/opt/render/project/.chromium-browser/linux-121.0.6167.85/chrome";

app.get("/proxy", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing ?url=");

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
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
