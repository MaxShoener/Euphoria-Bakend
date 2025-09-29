import express from "express";
import cors from "cors";
import { chromium } from "playwright";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// --- Browser endpoint ---
app.get("/browse", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing url parameter");

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const content = await page.content();
    await browser.close();
    res.send(content);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading page");
  }
});

// --- Proxy endpoint ---
app.use(
  "/proxy",
  createProxyMiddleware({
    target: "https://www.google.com", // example target
    changeOrigin: true,
    secure: false,
    pathRewrite: { "^/proxy": "" }
  })
);

app.listen(PORT, () => {
  console.log(`✅ Euphoria backend running on port ${PORT}`);
});