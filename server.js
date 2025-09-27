import express from "express";
import { chromium } from "playwright";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ Euphoria Backend Running");
});

// Proxy /browse?url=https://example.com
app.get("/browse", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing url parameter");

  try {
    const browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded" });

    const content = await page.content();
    await browser.close();

    res.send(content);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading page");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
