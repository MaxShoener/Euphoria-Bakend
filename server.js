const express = require("express");
const puppeteer = require("puppeteer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.urlencoded({ extended: true }));

// Serve the UI
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

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
