const express = require("express");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// Serve UI
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Proxy route
app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing URL parameter");

  try {
    const response = await fetch(target);
    let html = await response.text();

    // Strip <head> and <body> to avoid overriding our UI
    html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
    html = html.replace(/<body[^>]*>/i, '').replace(/<\/body>/i, '');

    // Rewrite all links and sources to go through proxy
    html = html.replace(/href="(http[s]?:\/\/[^"]+)"/gi, 'href="/proxy?url=$1"');
    html = html.replace(/src="(http[s]?:\/\/[^"]+)"/gi, 'src="/proxy?url=$1"');

    // Wrap content in a container div
    res.send(`<div style="overflow:auto; height:100%; width:100%;">${html}</div>`);
  } catch (err) {
    res.status(500).send(`Error loading ${target}: ${err.message}`);
  }
});

app.listen(PORT, () => console.log(`Fetch-based WISP proxy running on port ${PORT}`));
