// server.js
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Health check endpoint ---
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Euphoria backend running!" });
});

// --- Profile endpoint ---
app.get("/profile", (req, res) => {
  const username = req.query.username;
  if (!username) {
    return res.status(400).json({ error: "Missing username" });
  }

  // Example: return dummy data
  const profileData = {
    username,
    level: Math.floor(Math.random() * 100),
    coins: Math.floor(Math.random() * 1000),
    achievements: ["First login", "Welcome badge"]
  };

  res.json(profileData);
});

// --- Serve static frontend files ---
app.use(express.static("."));

// --- Fallback to index.html for SPA routes ---
app.get("*", (req, res) => {
  res.sendFile(`${process.cwd()}/index.html`);
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`✅ Euphoria backend running on port ${PORT}`);
});
