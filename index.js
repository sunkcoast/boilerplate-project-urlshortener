'use strict';

const express = require('express');
const cors = require('cors');
const dns = require('dns');
const url = require('url');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const DB_FILE = path.join(__dirname, 'urls.json');

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {}
  return { urls: [], counter: 1 };
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;

  let parsedUrl;
  try {
    parsedUrl = new URL(originalUrl);
  } catch (e) {
    return res.json({ error: 'invalid url' });
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return res.json({ error: 'invalid url' });
  }

  dns.lookup(parsedUrl.hostname, (err) => {
    if (err) return res.json({ error: 'invalid url' });

    const db = loadDB();
    const existing = db.urls.find(u => u.original_url === originalUrl);
    if (existing) {
      return res.json({ original_url: existing.original_url, short_url: existing.short_url });
    }

    const shortUrl = db.counter;
    db.urls.push({ original_url: originalUrl, short_url: shortUrl });
    db.counter += 1;
    saveDB(db);

    res.json({ original_url: originalUrl, short_url: shortUrl });
  });
});

app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = parseInt(req.params.short_url);
  if (isNaN(shortUrl)) return res.json({ error: 'wrong format' });

  const db = loadDB();
  const entry = db.urls.find(u => u.short_url === shortUrl);
  if (!entry) return res.json({ error: 'no short url found' });

  res.redirect(entry.original_url);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Running on port ' + PORT));

module.exports = app;
