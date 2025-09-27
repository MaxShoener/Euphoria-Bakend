import express from "express";
import bodyParser from "body-parser";
import { chromium } from "playwright";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public")); // Serve index.html

let browser;
let page;

async function initBrowser() {
    if (!browser) {
        browser = await chromium.launch({ headless: true });
        page = await browser.newPage();
    }
}

// Endpoint to navigate/search
app.post("/navigate", async (req, res) => {
    await initBrowser();
    const { urlOrSearch } = req.body;
    let targetUrl = urlOrSearch;
    if (!/^https?:\/\//i.test(urlOrSearch)) {
        targetUrl = "https://www.google.com/search?q=" + encodeURIComponent(urlOrSearch);
    }
    try {
        await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
        const screenshot = await page.screenshot({ type: "png" });
        res.set("Content-Type", "image/png");
        res.send(screenshot);
    } catch (e) {
        res.status(500).send("Error loading page: " + e.message);
    }
});

// Basic login simulation
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    // You can integrate real login logic here
    if (username && password) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});