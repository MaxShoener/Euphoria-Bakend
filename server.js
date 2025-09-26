const express = require("express");
const path = require("path");
const { chromium } = require("playwright"); // headless browser

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.urlencoded({ extended: true }));

// Serve UI
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Proxy route
app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing URL parameter");

  let browser;
  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(target, { waitUntil: "networkidle" });

    let content = await page.content();

    // Rewrite links to go through proxy
    content = content.replace(/href="(http[s]?:\/\/[^"]+)"/gi, 'href="/proxy?url=$1"');
    content = content.replace(/src="(http[s]?:\/\/[^"]+)"/gi, 'src="/proxy?url=$1"');

    res.send(content);
  } catch (err) {
    res.status(500).send(`Error loading ${target}: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`Playwright proxy running on port ${PORT}`));
