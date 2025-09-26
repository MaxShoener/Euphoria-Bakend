const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint to fetch external URLs
app.get("/fetch", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("No URL provided");

  try {
    const response = await fetch(url);
    const text = await response.text();
    res.send(text);
  } catch (err) {
    res.status(500).send(`Error fetching ${url}: ${err.message}`);
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Backend proxy running on port ${port}`);
});
