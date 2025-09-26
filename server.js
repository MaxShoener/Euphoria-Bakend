import express from "express";
import cors from "cors";
import { chromium } from "playwright-core";
import chromiumExecutablePath from "@sparticuz/chromium";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing URL");

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: chromiumExecutablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    const htmlContent = await page.content();

    res.setHeader("Content-Type", "text/html");
    res.send(htmlContent);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Error loading page");
  } finally {
    if (browser) await browser.close();
  }
});

app.get("/", (req, res) => {
  res.send("Euphoria Proxy Backend is running.");
});

app.listen(PORT, () => {
  console.log(`Euphoria Proxy Backend running on port ${PORT}`);
});
