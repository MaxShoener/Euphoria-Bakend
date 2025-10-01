import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.static(__dirname));

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* =====================================================
   PLAYWRIGHT PROXY (single route)
   ===================================================== */
app.get("/proxy", async (req, res) => {
  let targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing ?url=");

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "https://" + targetUrl;
  }

  try {
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(targetUrl, { waitUntil: "networkidle" });

    // Final rendered HTML after scripts run
    const content = await page.content();

    await browser.close();

    res.set("content-type", "text/html");
    res.send(content);
  } catch (err) {
    console.error("Playwright error:", err);
    res.status(500).send("Proxy failed: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Euphoria Playwright proxy running on port ${PORT}`);
});
