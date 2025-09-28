import express from "express";
import fetch from "node-fetch";
import { load } from "cheerio";
import { CookieJar } from "tough-cookie";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const app = express();
const port = process.env.PORT || 3000;

// setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(join(__dirname, "public")));

app.get("/browse", async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).send("Missing ?url param");
    }

    const response = await fetch(targetUrl, {
      redirect: "follow",
    });

    const html = await response.text();

    // ✅ Cheerio ESM fix
    const $ = load(html);

    // Example: rewrite all relative <a> links to go through /browse
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (href && !href.startsWith("http")) {
        $(el).attr("href", `/browse?url=${new URL(href, targetUrl).href}`);
      }
    });

    res.send($.html());
  } catch (err) {
    console.error("Browse error:", err);
    res.status(500).send("Error loading site");
  }
});

app.listen(port, () => {
  console.log(`✅ Backend running at http://localhost:${port}`);
});
