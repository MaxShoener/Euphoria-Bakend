import express from "express";
import pkg from "@tomphttp/bare-server-node";
import { createBareServer } from "@tomphttp/bare-server-node";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 8080;

let currentEngine = "ultraviolet";

// ---------- CORS ----------
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ---------- Health ----------
app.get("/health", (req, res) => {
  res.json({ status: "ok", engine: currentEngine });
});

// ---------- Engine ----------
app.get("/engine", (req, res) => {
  const set = (req.query.set || "").toLowerCase();
  if (set) {
    if (set === "ultraviolet" || set === "scramjet") {
      currentEngine = set;
      return res.json({ engine: currentEngine });
    } else return res.status(400).json({ error: "invalid engine" });
  }
  res.json({ engine: currentEngine });
});

// ---------- Proxy ----------
app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).json({ error: "Missing url" });

  try {
    const r = await fetch(target, {
      headers: { "User-Agent": "EuphoriaProxy/1.0" },
    });
    const text = await r.text();
    res.setHeader("Content-Type", r.headers.get("content-type") || "text/html");
    res.send(text);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(502).json({ error: "Failed to fetch target" });
  }
});

app.listen(PORT, () => console.log(`✅ Euphoria backend on port ${PORT}`));