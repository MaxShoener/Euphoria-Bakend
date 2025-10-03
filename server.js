import express from "express";
import morgan from "morgan";
import { createBareServer } from "@titaniumnetwork-dev/scramjet";

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(morgan("dev"));

// Root route
app.get("/", (req, res) => {
  res.send(`
    <h1>🚀 Scramjet Proxy</h1>
    <p>Your proxy is running with <b>Titanium Network Scramjet</b>.</p>
  `);
});

// Create Scramjet bare server
const bare = createBareServer("/scramjet/");

// Handle upgrade (WebSockets, fetch, etc.)
app.use((req, res, next) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    next();
  }
});

const server = app.listen(PORT, () => {
  console.log(`✅ Scramjet Proxy running on port ${PORT}`);
});

server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  }
});