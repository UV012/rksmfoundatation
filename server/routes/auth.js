const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT Id, Username, PasswordHash FROM AdminUsers WHERE Username = @username');

    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const match = await bcrypt.compare(password, user.PasswordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    await pool.request()
      .input('id', sql.Int, user.Id)
      .query('UPDATE AdminUsers SET LastLoginAt = SYSUTCDATETIME() WHERE Id = @id');

    const token = jwt.sign(
      { id: user.Id, username: user.Username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({ token, username: user.Username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

module.exports = router;
