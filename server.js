import express from "express";
import { chromium } from "playwright";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, "frontend"))); // serve frontend

let browser;
async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
  }
}

// Browse route for iframe streaming
app.get("/browse", async (req, res) => {
  await initBrowser();
  const page = await browser.newPage();
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing URL");

  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    const screenshot = await page.screenshot({ fullPage: true });
    res.set("Content-Type", "image/png");
    res.send(screenshot);
  } catch (err) {
    res.status(500).send("Error loading page: " + err.message);
  } finally {
    await page.close();
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));