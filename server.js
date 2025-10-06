// server.js - Euphoria Backend
// A simple Express server with CORS enabled for local file:// frontend

import express from "express"; // Web framework
import morgan from "morgan";   // HTTP request logger
import helmet from "helmet";   // Security headers
import fs from "fs";           // File system module
import path from "path";       // Path utilities

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.use(helmet());            // Adds security headers
app.use(morgan("dev"));       // Logs HTTP requests
app.use(express.json());      // Parse JSON bodies

// CORS for file:// usage
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// ===== Routes =====
app.get("/api/hello", (req, res) => {
  // Respond exactly with "hi" like the old backend
  res.send("hi");
});

// Extra route for demonstration
app.get("/api/info", (req, res) => {
  const info = {
    name: "Euphoria Backend",
    version: "1.0.0",
    description: "This backend serves a plain 'hi' text for the frontend",
    timestamp: new Date(),
    env: process.env.NODE_ENV || "development",
  };
  res.json(info);
});

// Optional static file serving (if needed)
const publicDir = path.join(process.cwd(), "public");
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  console.log("Serving static files from /public");
}

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  console.log(`Available routes: /api/hello, /api/info`);
});