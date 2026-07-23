// ============================================
//  MSSQL connection pool (mssql package)
// ============================================
require('dotenv').config();
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true'
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then(pool => {
        console.log('Connected to MSSQL');
        return pool;
      })
      .catch(err => {
        poolPromise = null; // allow retry on next call
        console.error('MSSQL connection failed:', err.message);
        throw err;
      });
  }
  return poolPromise;
}

module.exports = { sql, getPool };
