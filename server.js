const express = require("express");
const { chromium } = require("playwright"); // Option 1: Playwright with bundled Chromium
const fetch = require("node-fetch");       // Option 3: Lightweight fetch
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.urlencoded({ extended: true }));

// Utility to detect if JS rendering is needed (simple heuristic)
function requiresJSRendering(url) {
  const jsSites = ["chess.com"]; // add more JS-heavy sites here
  return jsSites.some(site => url.includes(site));
}

app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing URL parameter");

  try {
    if (requiresJSRendering(target)) {
      // Use Playwright for JS-heavy sites
      const browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });

      const page = await browser.newPage();
      await page.goto(target, { waitUntil: "networkidle" });

      const content = await page.content();
      await browser.close();

      res.send(content);
    } else {
      // Use fetch + Cheerio for lightweight sites
      const response = await fetch(target);
      if (!response.ok) throw new Error(`Failed to fetch ${target}`);
      const html = await response.text();
      const $ = cheerio.load(html);

      // Example: return the full HTML, you can modify to clean it up
      res.send($.html());
    }
  } catch (err) {
    res.status(500).send(`Error loading ${target}: ${err.message}`);
  }
});

app.listen(PORT, () => console.log(`Hybrid proxy running on port ${PORT}`));