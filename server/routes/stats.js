import express from "express";
import { sql, getPool } from "../db.js";

const router = express.Router();

// ------------------------------------------
// POST /api/stats/visit
// Increment visit counter
// ------------------------------------------

router.post("/visit", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      UPDATE SiteStats
      SET StatValue = StatValue + 1

      OUTPUT INSERTED.StatValue AS count

      WHERE StatKey = 'total_visits'
    `);

    const count = result.recordset[0]?.count || 0;

    res.json({
      count
    });

  } catch (err) {

    console.error("Visit Counter Error:", err);

    res.status(500).json({
      error: "Could not update counter."
    });
  }
});

// ------------------------------------------
// GET /api/stats/visit
// Read visit counter
// ------------------------------------------

router.get("/visit", async (req, res) => {

  try {

    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        StatValue AS count
      FROM SiteStats
      WHERE StatKey = 'total_visits'
    `);

    const count = result.recordset[0]?.count || 0;

    res.json({
      count
    });

  } catch (err) {

    console.error("Visit Counter Read Error:", err);

    res.status(500).json({
      error: "Could not read counter."
    });
  }
});

export default router;