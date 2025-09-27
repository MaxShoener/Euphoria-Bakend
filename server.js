import express from "express";
import { WebSocketServer } from "ws";
import { chromium } from "playwright";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("frontend")); // serves index.html

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const wss = new WebSocketServer({ server });

let browser, page;

async function initBrowser() {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
}

initBrowser();

wss.on("connection", ws => {
    ws.on("message", async msg => {
        const data = JSON.parse(msg.toString());
        if(!page) return;
        if(data.command === "navigate") await page.goto(data.value);
        if(data.command === "search") await page.goto(`https://www.google.com/search?q=${encodeURIComponent(data.value)}`);
        if(data.command === "back") await page.goBack();
        if(data.command === "forward") await page.goForward();

        const screenshot = await page.screenshot();
        ws.send(screenshot);
    });
});