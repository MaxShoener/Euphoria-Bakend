const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Euphoria Backend is running");
});

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing URL parameter");

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    const content = await page.content();

    await browser.close();
    res.send(content);
  } catch (err) {
    if (browser) await browser.close();
    console.error("Error fetching URL:", err);
    res.status(500).send("Failed to fetch the requested URL");
  }
});

app.listen(PORT, () => {
  console.log(`Euphoria backend running on port ${PORT}`);
});
