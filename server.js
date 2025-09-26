const express = require("express");
const { chromium } = require("playwright"); 
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send("Missing ?url parameter");
  }

  let browser;
  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

    let html = await page.content();

    // Inject script to handle clicks and form submits
    const injection = `
      <script>
        // Handle clicks
        document.addEventListener("click", (e) => {
          const a = e.target.closest("a");
          if (a && a.href) {
            e.preventDefault();
            window.parent.postMessage({ type: "navigate", url: a.href }, "*");
          }
        });

        // Handle form submissions
        document.addEventListener("submit", (e) => {
          e.preventDefault();
          const form = e.target;
          const formData = new FormData(form);
          const params = new URLSearchParams();
          for (const [key, value] of formData.entries()) {
            params.append(key, value);
          }
          let action = form.action || window.location.href;
          if (form.method.toLowerCase() === "get") {
            const newUrl = action + "?" + params.toString();
            window.parent.postMessage({ type: "navigate", url: newUrl }, "*");
          } else {
            // POST: just fallback to direct navigation
            window.parent.postMessage({ type: "navigate", url: action }, "*");
          }
        });
      </script>
    `;

    html = html.replace("</body>", injection + "</body>");

    res.send(html);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Error loading " + targetUrl + ": " + err.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Wisp proxy running on http://localhost:${PORT}`);
});