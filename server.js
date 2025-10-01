const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// Require UV + Scramjet
const uv = require("ultraviolet");
const scramjet = require("scramjet-proxy");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // serve index.html

// Proxy endpoint
app.post("/proxy", async (req, res) => {
  const { url, mode } = req.body;

  try {
    if (!url) return res.status(400).send("Missing URL");

    if (mode === "uv") {
      // Ultraviolet proxy
      const proxied = await uv.proxy(url);
      res.send(proxied);

    } else if (mode === "scramjet") {
      // Scramjet proxy
      const proxied = await scramjet.proxy(url);
      res.send(proxied);

    } else {
      res.status(400).send("Invalid proxy mode");
    }
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy failed: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});