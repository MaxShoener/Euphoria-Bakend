import express from "express";
import cors from "cors";
import { chromium } from "playwright";

const app = express();
app.use(cors());
app.use(express.json());

let browser;
const sessions = new Map(); // Map sessionID -> page

(async () => {
  browser = await chromium.launch({ headless: true });
  console.log("Playwright browser launched.");
})();

// Create a new browsing session
app.post("/session", async (req, res) => {
  try {
    const page = await browser.newPage();
    const sessionId = Math.random().toString(36).substring(2, 12);
    sessions.set(sessionId, page);
    res.json({ sessionId });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to create session: " + err.message);
  }
});

// Navigate session to a URL
app.post("/session/:id/navigate", async (req, res) => {
  const { id } = req.params;
  const { url } = req.body;
  const page = sessions.get(id);
  if (!page) return res.status(404).send("Session not found");

  try {
    await page.goto(url, { waitUntil: "networkidle" });
    res.send("Navigated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Navigation failed: " + err.message);
  }
});

// Return screenshot of session (for iframe fallback)
app.get("/session/:id/screenshot", async (req, res) => {
  const page = sessions.get(req.params.id);
  if (!page) return res.status(404).send("Session not found");
  const buffer = await page.screenshot({ fullPage: true });
  res.type("image/png").send(buffer);
});

// Close session
app.delete("/session/:id", async (req, res) => {
  const page = sessions.get(req.params.id);
  if (!page) return res.status(404).send("Session not found");
  await page.close();
  sessions.delete(req.params.id);
  res.send("Session closed");
});

app.listen(process.env.PORT || 3000, () => console.log("Server running..."));
