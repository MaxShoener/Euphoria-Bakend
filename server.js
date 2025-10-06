// server.js - Fully functional Euphoria backend
// Node.js 20+, Express-based minimal API
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// ===========================
// MIDDLEWARE
// ===========================

// Enable JSON parsing
app.use(express.json());

// Enable CORS for file:// frontend
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// ===========================
// ROUTES
// ===========================

// Root route
app.get("/", (req, res) => {
  res.send("Euphoria backend is alive!");
});

// /api/hello returns simple "hi"
app.get("/api/hello", (req, res) => {
  res.send("hi");
});

// /api/time returns current server time
app.get("/api/time", (req, res) => {
  res.json({ time: new Date().toISOString() });
});

// /api/echo echoes JSON POST body
app.post("/api/echo", (req, res) => {
  res.json({ youSent: req.body });
});

// Demo array route
const messages = ["Hello", "Euphoria", "NodeJS"];
app.get("/api/messages", (req, res) => {
  res.json({ messages });
});

// ===========================
// ERROR HANDLING
// ===========================

// 404 handler
app.use((req, res) => {
  res.status(404).send("Route not found");
});

// General error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Internal Server Error");
});

// ===========================
// START SERVER
// ===========================
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));