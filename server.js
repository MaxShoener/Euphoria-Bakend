const express = require("express");
const cors = require("cors");
const path = require("path");
const fetch = require("node-fetch");

const { createBareServer } = require("@tomphttp/bare-server-node");
const { uvPath, UVServer } = require("@titaniumnetwork-dev/ultraviolet");
const scramjet = require("@titaniumnetwork-dev/scramjet");

const app = express();
const bare = createBareServer("/bare/");

app.use(cors());
app.use(express.static(path.join(__dirname)));

// Ultraviolet
const uv = new UVServer({
  prefix: "/proxy/uv/",
  bare: "/bare/",
});
app.use(uvPath, uv.app);

// Scramjet route
app.get("/proxy/scramjet/:url", async (req, res) => {
  try {
    const target = decodeURIComponent(req.params.url);
    const response = await scramjet.fetch(target);
    const text = await response.text();

    res.set("content-type", response.headers.get("content-type") || "text/html");
    res.send(text);
  } catch (err) {
    res.status(500).send("Scramjet Error: " + err.message);
  }
});

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Bare server upgrade (needed for UV)
server.on("upgrade", (req, socket, head) => {
  bare.handleUpgrade(req, socket, head);
});