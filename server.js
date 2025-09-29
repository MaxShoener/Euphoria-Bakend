import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import url from "url";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ Health check
app.get("/", (req, res) => {
  res.send("✅ Euphoria backend running!");
});

/**
 * 🔄 Dynamic Proxy:
 * Usage:
 *   /proxy?url=https://www.google.com/search?q=test
 */
app.use("/proxy", (req, res, next) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: "Missing ?url= query parameter" });
  }

  try {
    const parsedUrl = new url.URL(targetUrl);

    return createProxyMiddleware({
      target: `${parsedUrl.protocol}//${parsedUrl.host}`,
      changeOrigin: true,
      secure: true,
      followRedirects: true,
      pathRewrite: {
        "^/proxy": "", // Remove /proxy prefix
      },
      router: () => parsedUrl.origin, // Ensure proper host
      onProxyReq: (proxyReq, req) => {
        // Rebuild path for correct routing
        proxyReq.path = parsedUrl.pathname + (parsedUrl.search || "");
      },
      onError: (err, req, res) => {
        console.error("❌ Proxy error:", err.message);
        res.status(502).json({ error: "Proxy request failed" });
      },
    })(req, res, next);
  } catch (err) {
    return res.status(400).json({ error: "Invalid URL" });
  }
});

// Example search test route (for debugging frontend)
app.get("/search", (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Missing query" });
  res.json({ result: `You searched for: ${q}` });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Euphoria backend running on port ${PORT}`);
});