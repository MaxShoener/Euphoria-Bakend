const express = require("express");
const path = require("path");
const { chromium } = require("playwright"); // make sure playwright is installed

const app = express();
const PORT = process.env.PORT || 10000;

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Proxy route
app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing URL parameter");

  let browser;
  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
      executablePath: process.env.CHROMIUM_PATH, // optional: specify a path if needed
    });

    const page = await browser.newPage();
    await page.goto(target, { waitUntil: "networkidle" });

    const content = await page.content();
    res.send(content);
  } catch (err) {
    console.error(err);
    res.status(500).send(`Error loading ${target}: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`Wisp proxy running at http://localhost:${PORT}`));