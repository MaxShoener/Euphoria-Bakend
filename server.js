import express from "express";
import cors from "cors";
import fetch from "node-fetch";

import Scramjet from "@titaniumnetwork-dev/scramjet";
import Ultraviolet from "@titaniumnetwork-dev/ultraviolet";

const app = express();
app.use(cors());
app.use(express.static("public")); // Serves index.html

const PORT = process.env.PORT || 10000;

// Toggle proxy engine: "scramjet" or "ultraviolet"
const PROXY_ENGINE = process.env.PROXY_ENGINE || "scramjet";

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing url parameter");

  try {
    let responseText;

    if (PROXY_ENGINE === "scramjet") {
      const stream = new Scramjet.HttpRequest(targetUrl);
      responseText = await stream.getText();
    } else if (PROXY_ENGINE === "ultraviolet") {
      const uv = new Ultraviolet(targetUrl);
      responseText = await uv.getText();
    } else {
      return res.status(500).send("Invalid PROXY_ENGINE");
    }

    res.send(responseText);
  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy failed: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT} using ${PROXY_ENGINE}`);
});