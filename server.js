// server.js
// Simple Express proxy for KicksDB API

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;


const cors = require('cors');
app.use(cors());

const KICKSDB_API_KEY = process.env.KICKS_DB_API || 'KICKS-4D2B-724A-8C96-6D10E9761E9C'; 
const KICKSDB_API_URL = 'https://api.kicks.dev/v3/stockx/products?limit=12';

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

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
