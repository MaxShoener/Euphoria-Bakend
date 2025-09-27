import express from 'express';
import fetch from 'node-fetch';
import session from 'express-session';

const app = express();
const PORT = process.env.PORT || 3000;

// Session for logins & cookies
app.use(session({
  secret: 'euphoria-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(express.static('.')); // serve index.html

// Proxy endpoint
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url');

  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'EuphoriaBrowser/1.0' },
      redirect: 'follow'
    });
    const contentType = response.headers.get('content-type');
    res.set('Content-Type', contentType || 'text/html');
    const body = await response.text();
    res.send(body);
  } catch (err) {
    res.status(500).send('Error fetching page: ' + err.message);
  }
});

app.listen(PORT, () => console.log(`Euphoria server running on port ${PORT}`));
