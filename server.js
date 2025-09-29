// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("✅ Euphoria backend running!");
});

// Proxy endpoint
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send("❌ Missing url parameter");
  }

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "user-agent":
          req.headers["user-agent"] ||
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        cookie: req.headers["cookie"] || "",
      },
    });

    // Forward headers
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "content-encoding") {
        res.setHeader(key, value);
      }
    });

    const body = await response.buffer();
    res.status(response.status).send(body);
  } catch (err) {
    console.error("❌ Proxy error:", err);
    res.status(500).send("Proxy failed: " + err.message);
  }
});

// Catch-all for unknown routes
app.use((req, res) => {
  res.status(404).send("❌ Not Found");
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
