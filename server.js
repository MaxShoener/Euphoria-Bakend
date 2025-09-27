const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Proxy endpoint (handles GET + POST)
app.all('/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).send('Missing url parameter');
    }

    // Forward headers (preserve cookies + user agent, etc.)
    const headers = { ...req.headers };
    delete headers['host']; // avoid conflict
    delete headers['content-length'];

    const options = {
      method: req.method,
      headers,
      redirect: 'follow',
    };

    if (req.method !== 'GET' && req.body) {
      options.body = JSON.stringify(req.body);
      headers['content-type'] = 'application/json';
    }

    // Fetch target page
    const response = await fetch(targetUrl, options);

    // Forward cookies + headers
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        res.setHeader('set-cookie', value);
      }
    });

    // Pipe status + body
    res.status(response.status);
    response.body.pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching target');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
