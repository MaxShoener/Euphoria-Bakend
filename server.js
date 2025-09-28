import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { CookieJar } from "tough-cookie";
import { URL } from "url";

const app = express();
const PORT = process.env.PORT || 3000;
const jar = new CookieJar();

app.get("/browse", async (req, res) => {
  let target = req.query.url;

  if (!target) {
    return res.status(400).send("Missing url param");
  }

  // Auto-convert search queries into Google search
  if (!/^https?:\/\//i.test(target)) {
    target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
  }

  try {
    const targetUrl = new URL(target);

    // Proxy request
    const cookieHeader = await jar.getCookieString(targetUrl.href);
    const response = await fetch(targetUrl.href, {
      headers: { Cookie: cookieHeader, "User-Agent": req.get("User-Agent") }
    });

    // Save cookies
    const setCookies = response.headers.raw()["set-cookie"];
    if (setCookies) {
      await Promise.all(
        setCookies.map(c => jar.setCookie(c, targetUrl.href))
      );
    }

    const contentType = response.headers.get("content-type");

    // If it's HTML → rewrite asset URLs
    if (contentType && contentType.includes("text/html")) {
      let html = await response.text();
      const $ = cheerio.load(html);

      // Rewrite links, scripts, images, forms
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (href && !href.startsWith("javascript:")) {
          $(el).attr("href", `/browse?url=${encodeURIComponent(new URL(href, targetUrl).href)}`);
        }
      });

      $("img[src], script[src], link[href]").each((_, el) => {
        const attr = el.tagName === "link" ? "href" : "src";
        const val = $(el).attr(attr);
        if (val) {
          $(el).attr(attr, `/browse?url=${encodeURIComponent(new URL(val, targetUrl).href)}`);
        }
      });

      $("form[action]").each((_, el) => {
        const action = $(el).attr("action");
        if (action) {
          $(el).attr("action", `/browse?url=${encodeURIComponent(new URL(action, targetUrl).href)}`);
        }
      });

      res.set("content-type", "text/html");
      res.send($.html());
    } else {
      // Binary assets: just pipe through
      res.set("content-type", contentType || "application/octet-stream");
      const buf = await response.arrayBuffer();
      res.send(Buffer.from(buf));
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy error: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running at http://localhost:${PORT}`);
});
