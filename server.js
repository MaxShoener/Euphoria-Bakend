import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.static(path.join(__dirname)));

// Proxy endpoint for all web requests from frontend
app.use("/proxy", createProxyMiddleware({
    target: "https://www.google.com",
    changeOrigin: true,
    pathRewrite: { "^/proxy": "" }
}));

// Serve frontend
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`✅ Euphoria backend running on port ${PORT}`);
});
