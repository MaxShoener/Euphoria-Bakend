import express from "express";
import cors from "cors";
import { createBareServer } from "ultraviolet-static/bare/server.js";
import { pipeline } from "scramjet";

const app = express();
const port = process.env.PORT || 8080;

// Allow frontend file:/// and CORS from anywhere
app.use(cors({ origin: "*" }));

// ===== Ultraviolet Proxy =====
const bare = createBareServer("/uv/");
app.use("/uv/", (req, res, next) => {
  bare.handleRequest(req, res, next);
});

// ===== Scramjet Proxy (example echo pipeline) =====
app.get("/scramjet", async (req, res) => {
  try {
    const { PassThrough } = await import("stream");
    const { StringStream } = await import("scramjet");

    const stream = new PassThrough();
    const result = await StringStream.from(["Connected to Scramjet proxy!"])
      .append("\n")
      .toStringStream()
      .run();

    res.setHeader("Content-Type", "text/plain");
    res.end(result);
  } catch (err) {
    res.status(500).send("Scramjet proxy error: " + err.message);
  }
});

// ===== Basic Info Route =====
app.get("/", (req, res) => {
  res.send("Euphoria backend running ✅");
});

// ===== Start Server =====
app.listen(port, () => {
  console.log(`✅ Euphoria backend live on port ${port}`);
});