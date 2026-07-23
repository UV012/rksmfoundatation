import dotenv from "dotenv";
dotenv.config();

import sql from "mssql";

const config = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate:
      process.env.DB_TRUST_SERVER_CERT === "true",
    enableArithAbort: true
  },

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

export async function getPool() {
  try {
    if (pool) return pool;

    pool = await sql.connect(config);

    console.log("✅ MSSQL Connected");

    return pool;
  } catch (err) {
    console.error("❌ MSSQL Connection Error:", err.message);
    throw err;
  }
}

export { sql };