import express from "express";
import cors from "cors";
import { createServer as createHttpServer } from "http";
import pkg from "@tomphttp/bare-server-node"; // <-- FIXED import
const { BareServer } = pkg;

const app = express();
const port = process.env.PORT || 8080;

// Create Bare proxy
const bare = new BareServer({ log: false });
const httpServer = createHttpServer();

// Allow cross-origin requests (so file:/// frontend can connect)
app.use(cors({ origin: "*" }));

// Root endpoint
app.get("/", (req, res) => {
  res.send("✅ Euphoria backend running correctly with Bare proxy (CJS-compatible)");
});

// Route bare proxy requests
httpServer.on("request", (req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

// Start server
httpServer.listen(port, () => {
  console.log(`✅ Euphoria backend is live on port ${port}`);
});