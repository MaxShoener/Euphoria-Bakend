import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Proxy endpoint: routes any URL through backend to avoid CORS
app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('No URL provided');

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'EuphoriaBrowser/1.0' } });
    const contentType = response.headers.get('content-type');
    const body = await response.text();
    res.set('Content-Type', contentType || 'text/html');
    res.send(body);
  } catch (err) {
    res.status(500).send(`Proxy error: ${err}`);
  }
});

app.listen(PORT, () => console.log(`Euphoria backend running on port ${PORT}`));
