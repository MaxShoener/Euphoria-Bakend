app.get("/proxy", async (req, res) => {
  let targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing ?url=");

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "https://" + targetUrl;
  }

  try {
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(targetUrl, { waitUntil: "networkidle" });

    // Intercept requests for resources and rewrite them
    const content = await page.content();

    await browser.close();

    // Rewrite relative URLs to go through our proxy again
    const rewritten = content.replace(
      / (href|src|action)=["'](?!https?:\/\/|data:|#)([^"']+)["']/gi,
      (match, attr, link) => {
        const absolute = new URL(link, targetUrl).href;
        return ` ${attr}="/proxy?url=${encodeURIComponent(absolute)}"`;
      }
    );

    res.set("content-type", "text/html");
    res.send(rewritten);
  } catch (err) {
    console.error("Playwright error:", err);
    res.status(500).send("Proxy failed: " + err.message);
  }
});
