import express from "express";
import cors from "cors";
import { createServer as createHttpServer } from "http";
import { BareServer } from "@tomphttp/bare-server-node";

const app = express();
const port = process.env.PORT || 8080;

// Bare proxy (replaces broken ultraviolet-static import)
const bare = new BareServer({ log: false });
const httpServer = createHttpServer();

// Allow everything (file:/// etc.)
app.use(cors({ origin: "*" }));

// Basic root route
app.get("/", (req, res) => {
  res.send("✅ Euphoria backend running correctly with Bare proxy");
});

// Bare proxy route
httpServer.on("request", (req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

// Start combined server
httpServer.listen(port, () => {
  console.log(`✅ Euphoria backend is live on port ${port}`);
});