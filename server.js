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
    const data = JSON.parse(message);

    try {
      // Launch browser if not already
      if (!browser) {
        browser = await playwright.chromium.launch();
        page = await browser.newPage();
      }

      // Handle navigation actions
      if (data.action) {
        switch(data.action) {
          case "back": await page.goBack(); break;
          case "forward": await page.goForward(); break;
          case "reload": await page.reload(); break;
          case "stop": clearInterval(intervalId); break;
        }
      }

      // Handle new URL/search
      if (data.query) {
        await page.goto(data.query.startsWith("http") ? data.query : `https://www.google.com/search?q=${encodeURIComponent(data.query)}`);

        // Start streaming screenshots
        if (!intervalId) {
          intervalId = setInterval(async () => {
            if (ws.readyState === 1) {
              const img = await page.screenshot({ type: "jpeg" });
              ws.send(img);
            }
          }, 1000);
        }
      }

      // Send first screenshot immediately
      if (page) {
        const screenshot = await page.screenshot({ type: "jpeg" });
        ws.send(screenshot);
      }

    } catch (err) {
      ws.send(JSON.stringify({ error: err.message }));
    }
  });

  ws.on("close", async () => {
    clearInterval(intervalId);
    if (browser) await browser.close();
  });
});