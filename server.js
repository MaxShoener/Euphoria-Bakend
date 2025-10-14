import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 8080;

let currentEngine = "ultraviolet";

// CORS middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", engine: currentEngine });
});

// Switch engine
app.get("/engine", (req, res) => {
  const set = (req.query.set || "").toLowerCase();
  if (set && ["ultraviolet", "scramjet"].includes(set)) {
    currentEngine = set;
    return res.json({ engine: currentEngine });
  }
  res.json({ engine: currentEngine });
});

// Proxy route
app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).json({ error: "Missing url" });

  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent": "EuphoriaProxy/1.2",
        "Accept": "*/*"
      }
    });

    const contentType = response.headers.get("content-type") || "text/html";
    res.setHeader("Content-Type", contentType);
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Proxy fetch error:", err.message);
    res.status(502).json({ error: "Failed to fetch target", detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Euphoria backend running on port ${PORT}`);
});