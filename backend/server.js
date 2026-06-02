// server.js
// Simple Express proxy for KicksDB API

const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

const app = express(); // <-- This was missing!
const PORT = process.env.PORT || 3001;

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser tools (curl, server-to-server) and same-machine calls.
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'https://sneakers-website-production.up.railway.app',
      'https://onicekicks.netlify.app',
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow GitHub Codespaces forwarded hosts (e.g. ...-5500.app.github.dev).
    if (/^https:\/\/[a-z0-9-]+\.app\.github\.dev$/i.test(origin)) {
      return callback(null, true);
    }

    // Allow Netlify hosted frontend domains.
    if (/^https:\/\/[a-z0-9-]+\.netlify\.app$/i.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

require('dotenv').config({ path: path.join(__dirname, '.env') });

const KICKSDB_API_KEY = process.env.KICKS_DB_API || 'KICKS-4D2B-724A-8C96-6D10E9761E9C'; 
const KICKSDB_API_URL = 'https://api.kicks.dev/v3/stockx/products?limit=12';
const WATCHLIST_FILE = path.join(__dirname, 'data', 'watchlist.json');

async function ensureWatchlistFile() {
  const dirPath = path.dirname(WATCHLIST_FILE);
  await fs.mkdir(dirPath, { recursive: true });
  try {
    await fs.access(WATCHLIST_FILE);
  } catch {
    await fs.writeFile(WATCHLIST_FILE, '[]', 'utf8');
  }
}

async function readWatchlist() {
  await ensureWatchlistFile();
  const raw = await fs.readFile(WATCHLIST_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeWatchlist(items) {
  await ensureWatchlistFile();
  await fs.writeFile(WATCHLIST_FILE, JSON.stringify(items, null, 2), 'utf8');
}

function normalizeWatchlistItem(payload) {
  const item = payload && typeof payload === 'object' ? payload : {};
  return {
    id: String(item.id || '').trim().toLowerCase(),
    name: String(item.name || 'Sneaker').trim(),
    image: String(item.image || '').trim(),
    brand: String(item.brand || '').trim(),
    livePrice: Number.isFinite(Number(item.livePrice)) ? Number(item.livePrice) : null,
    targetPrice: Number.isFinite(Number(item.targetPrice)) ? Number(item.targetPrice) : null,
    addedAt: item.addedAt ? String(item.addedAt) : new Date().toISOString(),
  };
}

app.get('/api/sneakers', async (req, res) => {
  try {
    const response = await fetch(KICKSDB_API_URL, {
      headers: {
        'Authorization': `Bearer ${KICKSDB_API_KEY}`
      }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'KicksDB API error' });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.get('/api/watchlist', async (req, res) => {
  try {
    const watchlist = await readWatchlist();
    res.json(watchlist);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load watchlist', details: err.message });
  }
});

app.post('/api/watchlist', async (req, res) => {
  try {
    const item = normalizeWatchlistItem(req.body);
    if (!item.id) {
      return res.status(400).json({ error: 'Missing required field: id' });
    }

    const watchlist = await readWatchlist();
    const existingIndex = watchlist.findIndex((entry) => entry.id === item.id);

    if (existingIndex >= 0) {
      watchlist[existingIndex] = {
        ...watchlist[existingIndex],
        ...item,
        addedAt: watchlist[existingIndex].addedAt || item.addedAt,
      };
    } else {
      watchlist.unshift(item);
    }

    await writeWatchlist(watchlist);
    res.status(201).json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save watchlist item', details: err.message });
  }
});

app.patch('/api/watchlist/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim().toLowerCase();
    const targetPrice = Number(req.body && req.body.targetPrice);
    if (!id) {
      return res.status(400).json({ error: 'Missing watchlist id' });
    }
    if (!Number.isFinite(targetPrice) || targetPrice < 0) {
      return res.status(400).json({ error: 'targetPrice must be a valid non-negative number' });
    }

    const watchlist = await readWatchlist();
    const index = watchlist.findIndex((item) => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Watchlist item not found' });
    }

    watchlist[index] = {
      ...watchlist[index],
      targetPrice,
    };

    await writeWatchlist(watchlist);
    res.json({ success: true, item: watchlist[index] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update watchlist item', details: err.message });
  }
});

app.delete('/api/watchlist/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim().toLowerCase();
    if (!id) {
      return res.status(400).json({ error: 'Missing watchlist id' });
    }

    const watchlist = await readWatchlist();
    const nextItems = watchlist.filter((item) => item.id !== id);

    if (nextItems.length === watchlist.length) {
      return res.status(404).json({ error: 'Watchlist item not found' });
    }

    await writeWatchlist(nextItems);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete watchlist item', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});