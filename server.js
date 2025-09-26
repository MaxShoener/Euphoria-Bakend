const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.urlencoded({ extended: true }));

// Serve the UI
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Proxy route
app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing URL parameter");

  try {
    const response = await fetch(target);
    const text = await response.text();
    res.send(text);
  } catch (err) {
    res.status(500).send(`Error loading ${target}: ${err.message}`);
  }
});

app.listen(PORT, () => console.log(`Fetch-based WISP proxy running on port ${PORT}`));
