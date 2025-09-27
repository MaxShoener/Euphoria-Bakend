import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { chromium } from 'playwright';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

let browser;

async function initBrowser() {
    if (!browser) {
        browser = await chromium.launch({ headless: true });
    }
}

app.get('/browse', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('No URL provided');

    await initBrowser();

    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const screenshotBuffer = await page.screenshot({ fullPage: true });
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': screenshotBuffer.length
        });
        res.end(screenshotBuffer);
    } catch (err) {
        res.status(500).send('Failed to load page: ' + err.message);
    } finally {
        await page.close();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});