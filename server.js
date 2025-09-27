import express from 'express';
import { chromium } from 'playwright';

const app = express();
const PORT = process.env.PORT || 10000;

let browser;

async function initBrowser() {
    if (!browser) {
        browser = await chromium.launch({ headless: true });
    }
}

app.use(express.json());
app.use(express.static('../frontend')); // Serve your index.html

app.get('/browse', async (req, res) => {
    await initBrowser();
    const url = req.query.url || 'https://www.google.com';
    const page = await browser.newPage();
    await page.goto(url);
    const screenshot = await page.screenshot({ type: 'jpeg' });
    await page.close();
    res.set('Content-Type', 'image/jpeg');
    res.send(screenshot);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));