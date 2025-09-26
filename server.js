const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 10000;

// Enable query parameter parsing
app.use(express.urlencoded({ extended: true }));

// Proxy route
app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing URL parameter");

  let browser;
  try {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.goto(target, { waitUntil: "networkidle2" });
    const content = await page.content();
    res.send(content);
  } catch (err) {
    res.status(500).send(`Error loading ${target}: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`Headless proxy running on port ${PORT}`));
