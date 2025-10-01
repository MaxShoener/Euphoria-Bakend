const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// Titanium Network proxies
const UV = require("@titaniumnetwork-dev/ultraviolet");
const Scramjet = require("@titaniumnetwork-dev/scramjet");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // serves index.html

app.post("/proxy", async (req, res) => {
  const { url, mode } = req.body;

  if (!url) return res.status(400).send("Missing URL");

  try {
    if (mode === "uv") {
      const uv = new UV();
      return uv.request(url, req, res);
    } else if (mode === "scramjet") {
      const scramjet = new Scramjet();
      return scramjet.request(url, req, res);
    } else {
      return res.status(400).send("Invalid proxy mode. Use 'uv' or 'scramjet'.");
    }
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy failed: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Euphoria backend running on port ${PORT}`);
});