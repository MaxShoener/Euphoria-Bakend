const express = require("express");
const chromium = require("@sparticuz/chromium");
const playwright = require("playwright-core");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing ?url parameter");

  let browser;
  try {
    browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

    let html = await page.content();
    html = html.replace(
      "</body>",
      `<script>
        document.addEventListener("click", e => {
          const a = e.target.closest("a");
          if (a && a.href) {
            e.preventDefault();
            window.parent.postMessage({ type: "navigate", url: a.href }, "*");
          }
        });
        document.addEventListener("submit", e => {
          e.preventDefault();
          const form = e.target;
          const data = new FormData(form);
          const params = new URLSearchParams();
          for (const [k,v] of data.entries()) params.append(k,v);
          let action = form.action || window.location.href;
          if (form.method.toLowerCase() === "get") {
            window.parent.postMessage({ type:"navigate", url: action+"?"+params }, "*");
          } else {
            window.parent.postMessage({ type:"navigate", url: action }, "*");
          }
        });
      </script></body>`
    );

    res.send(html);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Error loading " + targetUrl + ": " + err.message);
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log("Proxy running on port " + PORT);
});