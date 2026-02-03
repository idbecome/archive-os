const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: 'localhost',
  user: 'root', // Default XAMPP
  password: '', // Default XAMPP kosong
  database: 'archive_os'
}).promise();

// Endpoint Inventory
app.get('/api/inventory', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM inventory ORDER BY id ASC');
    res.json(rows);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const slots = req.body;
    for (const slot of slots) {
      await db.query(
        'UPDATE inventory SET status = ?, box_data = ?, history = ?, last_updated = ? WHERE id = ?',
        [slot.status, JSON.stringify(slot.boxData), JSON.stringify(slot.history), slot.lastUpdated, slot.id]
      );
    }
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

// Endpoint Logs
app.get('/api/logs', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM logs ORDER BY timestamp DESC');
  res.json(rows);
});

app.post('/api/logs', async (req, res) => {
  const { user, action, details } = req.body;
  await db.query('INSERT INTO logs (user, action, details) VALUES (?, ?, ?)', [user, action, details]);
  res.sendStatus(201);
});

app.listen(3001, () => console.log('Server running on port 3001'));
