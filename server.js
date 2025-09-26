const express = require("express");
const { chromium } = require("playwright"); // Playwright for browser automation
const PORT = process.env.PORT || 10000;

const app = express();
app.use(express.urlencoded({ extended: true }));

// Helper: rewrite all <a> href links to go through the proxy
function rewriteLinks(html, proxyBase) {
  return html.replace(/href=["'](.*?)["']/gi, (match, href) => {
    // Ignore empty, anchor, or javascript links
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return match;

    let fullUrl = href;
    // Ensure the href is absolute
    if (!/^https?:\/\//i.test(href)) {
      fullUrl = proxyBase + encodeURIComponent(href);
    } else {
      fullUrl = proxyBase + encodeURIComponent(href);
    }
    return `href="${fullUrl}"`;
  });
}

// Proxy route
app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing URL parameter");

  let browser;
  try {
    browser = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.goto(target, { waitUntil: "networkidle" });

    let content = await page.content();

    // Rewrite links to go through the proxy
    content = rewriteLinks(content, "/proxy?url=");

    res.send(content);
  } catch (err) {
    res.status(500).send(`Error loading ${target}: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`Euphoria proxy running on port ${PORT}`));