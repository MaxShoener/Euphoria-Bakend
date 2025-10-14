import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let currentEngine = "ultraviolet"; // default engine

app.get("/engine", (req, res) => {
  res.json({ engine: currentEngine });
});

app.post("/engine", (req, res) => {
  const { engine } = req.body;
  if (["ultraviolet", "scramjet"].includes(engine)) {
    currentEngine = engine;
    res.json({ engine: currentEngine });
  } else {
    res.status(400).json({ error: "Invalid engine" });
  }
});

app.get("/proxy", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing URL");

  try {
    const response = await fetch(url, { timeout: 10000 });
    const text = await response.text();
    res.send(text);
  } catch (err) {
    res.status(500).send("Engine may be temporarily down.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));