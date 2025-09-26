const express = require("express");
const playwright = require("playwright-core");
const chromium = require("@sparticuz/chromium");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.urlencoded({ extended: true }));

// Proxy route
app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing URL parameter");

  let browser;
  try {
    browser = await playwright.chromium.launch({
      executablePath: chromium.path,
      args: chromium.args,
      headless: true,
      ignoreDefaultArgs: ["--enable-automation"]
    });

    const page = await browser.newPage();
    await page.goto(target, { waitUntil: "networkidle" });

    const content = await page.content();
    res.send(content);
  } catch (err) {
    res.status(500).send(`Error loading ${target}: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`Wisp proxy running on http://localhost:${PORT}`));