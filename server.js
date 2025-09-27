import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Proxy route for external websites
app.get('/proxy', async (req, res) => {
  try {
    const target = req.query.url;
    if (!target) return res.status(400).send('Missing URL');
    
    const response = await fetch(target, {
      headers: { 'User-Agent': 'Euphoria/1.0' }
    });
    
    const body = await response.text();
    res.send(body);
  } catch (err) {
    res.status(500).send(`Error fetching ${req.query.url}: ${err.message}`);
  }
});

app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Euphoria running on port ${PORT}`));
