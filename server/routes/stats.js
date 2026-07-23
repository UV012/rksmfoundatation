const express = require('express');
const { sql, getPool } = require('../db');

const router = express.Router();

// POST /api/stats/visit — increment and return the running total.
// No auth needed; this is a public page-view counter, not sensitive data.
router.post('/visit', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      UPDATE SiteStats SET StatValue = StatValue + 1
      OUTPUT INSERTED.StatValue AS count
      WHERE StatKey = 'total_visits'
    `);
    const count = result.recordset[0] ? result.recordset[0].count : 0;
    res.json({ count });
  } catch (err) {
    console.error('Visit counter error:', err);
    res.status(500).json({ error: 'Could not update counter.' });
  }
});

// GET /api/stats/visit — read-only, doesn't increment
router.get('/visit', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT StatValue AS count FROM SiteStats WHERE StatKey = 'total_visits'`);
    const count = result.recordset[0] ? result.recordset[0].count : 0;
    res.json({ count });
  } catch (err) {
    console.error('Visit counter read error:', err);
    res.status(500).json({ error: 'Could not read counter.' });
  }
});

module.exports = router;
