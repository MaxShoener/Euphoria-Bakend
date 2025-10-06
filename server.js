// server.js - Minimal Euphoria backend
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// CORS for file:// frontend
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// Always return "hi" for /api/hello
app.get("/api/hello", (req, res) => {
  res.send("hi");
});

// Start server
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));