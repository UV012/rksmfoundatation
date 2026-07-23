// ============================================
//  One-time helper: create or reset an admin user
//  Usage: node create-admin.js <username> <password>
// ============================================
require('dotenv').config();
const bcrypt = require('bcrypt');
const { sql, getPool } = require('./db');

async function main() {
  const [, , username, password] = process.argv;
  if (!username || !password) {
    console.error('Usage: node create-admin.js <username> <password>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password should be at least 8 characters.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  const pool = await getPool();

  const existing = await pool.request()
    .input('username', sql.NVarChar, username)
    .query('SELECT Id FROM AdminUsers WHERE Username = @username');

  if (existing.recordset.length > 0) {
    await pool.request()
      .input('username', sql.NVarChar, username)
      .input('hash', sql.NVarChar, hash)
      .query('UPDATE AdminUsers SET PasswordHash = @hash WHERE Username = @username');
    console.log(`Password updated for existing admin user "${username}".`);
  } else {
    await pool.request()
      .input('username', sql.NVarChar, username)
      .input('hash', sql.NVarChar, hash)
      .query('INSERT INTO AdminUsers (Username, PasswordHash) VALUES (@username, @hash)');
    console.log(`Admin user "${username}" created.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
