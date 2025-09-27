import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { chromium } from "playwright";

const app = express();
app.use(cors());
app.use(bodyParser.json());

let browser;

(async () => {
  try {
    browser = await chromium.launch({ headless: true });
    console.log("Playwright browser launched!");
  } catch (err) {
    console.error("Failed to launch browser:", err);
  }
})();

app.get("/", (req, res) => {
  res.send("Euphoria backend is running!");
});

// Example route to render a page
app.get("/browse", async (req, res) => {
  const url = req.query.url || "https://www.google.com";
  if (!browser) return res.status(500).send("Browser not initialized");

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const content = await page.content();
    await context.close();
    res.send(content);
  } catch (err) {
    await context.close();
    console.error("Error loading page:", err);
    res.status(500).send("Failed to load page");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
