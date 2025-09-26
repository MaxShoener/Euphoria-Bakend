import express from "express";
import cors from "cors";
import { chromium } from "playwright";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Proxy endpoint
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing URL");

  let browser;
  try {
    // Launch browser in headless mode
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to target URL
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

    // Get full HTML content
    const htmlContent = await page.content();

    res.setHeader("Content-Type", "text/html");
    res.send(htmlContent);
  } catch (err) {
    console.error("Error proxying URL:", err);
    res.status(500).send("Error loading URL");
  } finally {
    if (browser) await browser.close();
  }
});

// Basic health check
app.get("/", (req, res) => {
  res.send("Euphoria Proxy Backend is running.");
});

app.listen(PORT, () => {
  console.log(`Euphoria Proxy Backend running on port ${PORT}`);
});
