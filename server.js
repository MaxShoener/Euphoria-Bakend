import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createScramjetProxy } from "@titaniumnetwork-dev/scramjet";
import { createUVProxy } from "@titaniumnetwork-dev/ultraviolet";

const app = express();
app.use(cors());
app.use(express.static("public"));

const PORT = process.env.PORT || 8080;

// Scramjet and UV proxies
const scramjetProxy = createScramjetProxy();
const uvProxy = createUVProxy();

// /proxy endpoint with engine selection
app.get("/proxy", async (req, res) => {
  const { url, engine } = req.query;
  if (!url) return res.status(400).send("Missing url");

  try {
    if (engine === "uv") {
      uvProxy.web(req, res, { target: decodeURIComponent(url) });
    } else {
      // default to Scramjet
      scramjetProxy.web(req, res, { target: decodeURIComponent(url) });
    }
  } catch (err) {
    console.error("Proxy failed:", err);
    res.status(500).send("Proxy failed: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});