import express from "express";
import uvPkg from "ultraviolet";
const { BareServer } = uvPkg;
import { StringStream } from "scramjet";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.get("/api/hi", (req, res) => {
  res.json({ message: "Hi from Euphoria backend!" });
});

app.post("/api/echo", async (req, res) => {
  try {
    const dataStream = new StringStream(JSON.stringify(req.body));
    const result = await dataStream.map(chunk => chunk.toUpperCase()).toArray();
    res.json({ processed: result.join("") });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

const server = new BareServer(app);
server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});