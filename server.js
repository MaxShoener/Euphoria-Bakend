// server.js
import pkg from "@tomphttp/bare-server-node";
const { BareServer } = pkg;

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Example endpoint
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from backend!" });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});