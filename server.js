const express = require('express');
const path = require('path');
const fetch = require('node-fetch'); // install with `npm install node-fetch`
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Proxy route
app.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).send('No URL provided');
    
    const response = await fetch(url);
    const text = await response.text();
    
    res.send(text);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Catch-all route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Euphoria server running on port ${PORT}`));
