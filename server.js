import express from "express";
import { WebSocketServer } from "ws";
import playwright from "playwright";

const app = express();
const port = process.env.PORT || 3000;

// Serve static frontend
app.use(express.static("frontend"));

// Start HTTP server
const server = app.listen(port, () => console.log(`Backend running on port ${port}`));

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", ws => {
  let browser, page;
  let intervalId;

  ws.on("message", async message => {
    const { query } = JSON.parse(message);

    try {
      if (!browser) {
        browser = await playwright.chromium.launch();
        page = await browser.newPage();
      }

      await page.goto(query.startsWith("http") ? query : `https://www.google.com/search?q=${encodeURIComponent(query)}`);
      
      // Send first screenshot immediately
      const screenshot = await page.screenshot({ type: "jpeg" });
      ws.send(screenshot);

      // Auto-stream every second
      intervalId = setInterval(async () => {
        if (ws.readyState === 1) {
          const img = await page.screenshot({ type: "jpeg" });
          ws.send(img);
        }
      }, 1000);

    } catch (err) {
      ws.send(JSON.stringify({ error: err.message }));
    }
  });

  ws.on("close", async () => {
    clearInterval(intervalId);
    if (browser) await browser.close();
  });
});