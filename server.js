import express from "express";
import morgan from "morgan";
import { createBareServer as createScramjet } from "@titaniumnetwork-dev/scramjet";
import { createBareServer as createUV } from "@titaniumnetwork-dev/ultraviolet";

const app = express();
const PORT = process.env.PORT || 8080;

// Choose default proxy (can be changed via env)
const DEFAULT_PROXY = process.env.PROXY || "scramjet"; // "scramjet" or "uv"

// Logging
app.use(morgan("dev"));

// UI landing
app.get("/", (req, res) => {
  res.send(`
    <h1>🚀 Dual Proxy Service</h1>
    <p>Currently running: <b>${DEFAULT_PROXY.toUpperCase()}</b></p>
    <p>Endpoints:</p>
    <ul>
      <li><a href="/scramjet/">Scramjet Proxy</a></li>
      <li><a href="/uv/">Ultraviolet Proxy</a></li>
    </ul>
    <p>Change default by setting <code>PROXY</code> env var to <code>scramjet</code> or <code>uv</code>.</p>
  `);
});

// Scramjet instance
const scramjet = createScramjet("/scramjet/");

// UV instance
const uv = createUV("/uv/");

// Route requests
app.use((req, res, next) => {
  if (scramjet.shouldRoute(req)) {
    scramjet.routeRequest(req, res);
  } else if (uv.shouldRoute(req)) {
    uv.routeRequest(req, res);
  } else {
    next();
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Dual Proxy running on port ${PORT}`);
  console.log(`🌐 Default Proxy: ${DEFAULT_PROXY}`);
});

// Handle WebSocket upgrades
server.on("upgrade", (req, socket, head) => {
  if (scramjet.shouldRoute(req)) {
    scramjet.routeUpgrade(req, socket, head);
  } else if (uv.shouldRoute(req)) {
    uv.routeUpgrade(req, socket, head);
  }
});