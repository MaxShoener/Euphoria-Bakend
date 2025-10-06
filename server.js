import express from "express";
import Scramjet from "scramjet";
import Ultraviolet from "ultraviolet";

const app = express();
const port = process.env.PORT || 3000;

// Serve static files if needed
app.use(express.static("public"));

// Example endpoint streaming numbers using Scramjet
app.get("/stream", async (req, res) => {
  const { StringStream } = Scramjet;
  const numbers = new StringStream([...Array(1000).keys()].map(n => n + "\n"));

  numbers.pipe(res);
});

// Example endpoint using Ultraviolet for string manipulation
app.get("/uppercase", (req, res) => {
  const result = Ultraviolet.encode("Hello from Ultraviolet!");
  res.send(result);
});

// Basic health endpoint
app.get("/hi", (req, res) => {
  res.send("Hi! Backend is running ✅");
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});