const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();
app.use(cors());

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing url");

  let browser;
  try {
    // Launch Chromium in headless mode with sandbox disabled
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(decodeURIComponent(targetUrl), { waitUntil: "networkidle" });
    const content = await page.content();

    res.send(content);
  } catch (err) {
    console.error("Proxy failed:", err);
    res.status(500).send("Proxy failed: " + err);
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
