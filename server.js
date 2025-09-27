import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const proxyUrl = "/proxy";

app.all(proxyUrl, async (req, res) => {
  try {
    const target = req.method === "GET" 
      ? req.query.url 
      : req.body.url;

    if (!target) {
      return res.status(400).send("Missing target URL");
    }

    const url = new URL(target);

    // Forward headers & cookies
    const headers = { ...req.headers };
    delete headers.host;

    const response = await fetch(url.href, {
      method: req.method,
      headers,
      body: req.method !== "GET" ? req.body.body : undefined,
      redirect: "manual"
    });

    // Copy status and headers
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        res.append("set-cookie", value);
      } else {
        res.setHeader(key, value);
      }
    });

    // If HTML, rewrite links/forms
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      let text = await response.text();

      // Rewrite form actions
      text = text.replace(/<form([^>]*)action="([^"]*)"/gi, (m, attrs, action) => {
        let newUrl = `/proxy?url=${encodeURIComponent(new URL(action, url).href)}`;
        return `<form${attrs}action="${newUrl}"`;
      });

      // Rewrite <a href="...">
      text = text.replace(/<a([^>]*)href="([^"]*)"/gi, (m, attrs, href) => {
        let newUrl = `/proxy?url=${encodeURIComponent(new URL(href, url).href)}`;
        return `<a${attrs}href="${newUrl}"`;
      });

      // Rewrite <script src="...">
      text = text.replace(/<script([^>]*)src="([^"]*)"/gi, (m, attrs, src) => {
        let newUrl = `/proxy?url=${encodeURIComponent(new URL(src, url).href)}`;
        return `<script${attrs}src="${newUrl}"`;
      });

      res.send(text);
    } else {
      // Non-HTML (images, CSS, JS, etc.)
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy error: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
