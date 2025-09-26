const WebSocket = require("ws");
const http = require("http");
const fetch = require("node-fetch");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on("connection", ws => {
  ws.on("message", async message => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      return;
    }

    if (data.action === "fetch" && data.url) {
      try {
        const res = await fetch(data.url);
        const text = await res.text();
        ws.send(JSON.stringify({ id: data.id, body: text }));
      } catch (e) {
        ws.send(JSON.stringify({ id: data.id, body: `<p>Failed: ${e}</p>` }));
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`WISP proxy running on port ${PORT}`)
);
