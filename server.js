const express = require("express");
const fetch = require("node-fetch");
const { URL } = require("url");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for JSON parsing
app.use(express.json());

// Proxy endpoint
app.get("/proxy", async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).send("Missing ?url parameter");
    }

    let finalUrl = targetUrl.startsWith("http")
      ? targetUrl
      : "https://" + targetUrl;

    const response = await fetch(finalUrl, {
      headers: { "User-Agent": "Mozilla/5.0 Euphoria-Proxy" },
    });

    let contentType = response.headers.get("content-type");
    let body = await response.text();

    // Rewriter only for HTML
    if (contentType && contentType.includes("text/html")) {
      const base = new URL(finalUrl);

      // Rewrite all src/href/form actions to go through proxy
      body = body.replace(
        /(href|src|action)=["'](.*?)["']/gi,
        (match, attr, value) => {
          if (value.startsWith("http")) {
            return `${attr}="/proxy?url=${encodeURIComponent(value)}"`;
          } else if (value.startsWith("//")) {
            return `${attr}="/proxy?url=${encodeURIComponent(
              base.protocol + value
            )}"`;
          } else if (value.startsWith("/")) {
            return `${attr}="/proxy?url=${encodeURIComponent(
              base.origin + value
            )}"`;
          } else {
            return `${attr}="/proxy?url=${encodeURIComponent(
              base.origin + "/" + value
            )}"`;
          }
        }
      );
    }

    res.setHeader("Content-Type", contentType || "text/html");
    res.send(body);
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy Error: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
