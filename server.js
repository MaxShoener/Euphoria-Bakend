import express from "express";
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

let browser;

async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    console.log("Chromium initialized");
  }
  return browser;
}

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/browse", async (req, res) => {
  const url = req.query.url || "https://www.google.com";
  const browser = await initBrowser();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const screenshot = await page.screenshot();
  await page.close();
  res.type("image/png").send(screenshot);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));