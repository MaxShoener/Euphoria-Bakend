import express from 'express';
import path from 'path';

const app = express();
const __dirname = path.resolve();

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/browse', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/browse.html'));
});

app.listen(3000, () => console.log('Server running on port 3000'));
