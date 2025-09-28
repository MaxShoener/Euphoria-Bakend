import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { CookieJar } from "tough-cookie";
import { URL } from "url";
import bodyParser from "body-parser";
import http from "http";
import { createProxyServer } from "http-proxy";

const app = express();
const server = http.createServer(app);
const proxy = createProxyServer({ ws: true, changeOrigin: true });
const PORT = process.env.PORT || 3000;
const jar = new CookieJar();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Helper: proxy HTTP requests
async function proxyRequest(method, target, body, headers) {
  const targetUrl = new URL(target);
  const cookieHeader = await jar.getCookieString(targetUrl.href);

  const response = await fetch(targetUrl.href, {
    method,
    headers: {
      ...headers,
      Host: targetUrl.host, // <-- fix TLS error
      Cookie: cookieHeader,
      "User-Agent":
        headers["user-agent"] ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36",
    },
    body,
  });

  const setCookies = response.headers.raw()["set-cookie"];
  if (setCookies) {
    await Promise.all(setCookies.map((c) => jar.setCookie(c, targetUrl.href)));
  }

  return response;
}

// GET proxy
app.get("/browse", async (req, res) => {
  let target = req.query.url;
  if (!target) return res.status(400).send("Missing url param");

  if (!/^https?:\/\//i.test(target)) {
    target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
  }

  try {
    const response = await proxyRequest("GET", target, null, req.headers);
    await handleResponse(response, target, res);
  } catch (err) {
    console.error("Proxy GET error:", err.message);
    res.status(500).send("Proxy GET error: " + err.message);
  }
});

// POST proxy
app.post("/browse", async (req, res) => {
  let target = req.query.url;
  if (!target) return res.status(400).send("Missing url param");

  try {
    const body =
      req.is("application/json") || req.is("application/x-www-form-urlencoded")
        ? new URLSearchParams(req.body).toString()
        : req.body;

    const response = await proxyRequest("POST", target, body, {
      ...req.headers,
      "content-type": req.headers["content-type"],
    });

    await handleResponse(response, target, res);
  } catch (err) {
    console.error("Proxy POST error:", err.message);
    res.status(500).send("Proxy POST error: " + err.message);
  }
});

// WebSocket proxy
server.on("upgrade", (req, socket, head) => {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const target = urlObj.searchParams.get("url");
    if (!target) {
      socket.destroy();
      return;
    }

    proxy.ws(req, socket, head, {
      target,
      changeOrigin: true,
      ws: true,
    });
  } catch (err) {
    console.error("WebSocket proxy error:", err.message);
    socket.destroy();
  }
});

// Rewrite & respond
async function handleResponse(response, target, res) {
  const contentType = response.headers.get("content-type");

  if (contentType && contentType.includes("text/html")) {
    let html = await response.text();
    const $ = cheerio.load(html);
    const targetUrl = new URL(target);

    // Rewrite links
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href && !href.startsWith("javascript:")) {
        $(el).attr(
          "href",
          `/browse?url=${encodeURIComponent(new URL(href, targetUrl).href)}`
        );
      }
    });

    // Rewrite assets
    $("img[src], script[src], link[href]").each((_, el) => {
      const attr = el.tagName === "link" ? "href" : "src";
      const val = $(el).attr(attr);
      if (val) {
        $(el).attr(
          attr,
          `/browse?url=${encodeURIComponent(new URL(val, targetUrl).href)}`
        );
      }
    });

    // Rewrite forms → proxy through /browse
    $("form[action]").each((_, el) => {
      const action = $(el).attr("action");
      if (action) {
        $(el).attr(
          "action",
          `/browse?url=${encodeURIComponent(new URL(action, targetUrl).href)}`
        );
      }
      $(el).attr("method", "post");
    });

    res.set("content-type", "text/html");
    res.send($.html());
  } else {
    res.set("content-type", contentType || "application/octet-stream");
    const buf = await response.arrayBuffer();
    res.send(Buffer.from(buf));
  }
}

server.listen(PORT, () => {
  console.log(`Proxy running at http://localhost:${PORT}`);
});
