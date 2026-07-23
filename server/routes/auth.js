import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sql, getPool } from "../db.js";

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: "Username and password are required."
    });
  }

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .query(`
        SELECT Id, Username, PasswordHash
        FROM AdminUsers
        WHERE Username = @username
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password."
      });
    }

    const user = result.recordset[0];

    // Check password hash exists
    if (!user.PasswordHash) {
      return res.status(500).json({
        success: false,
        error: "PasswordHash is missing in database."
      });
    }

    const match = await bcrypt.compare(password, user.PasswordHash);

    if (!match) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password."
      });
    }

    await pool
      .request()
      .input("id", sql.Int, user.Id)
      .query(`
        UPDATE AdminUsers
        SET LastLoginAt = SYSUTCDATETIME()
        WHERE Id = @id
      `);

    const token = jwt.sign(
      {
        id: user.Id,
        username: user.Username,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "8h",
      }
    );

    return res.json({
      success: true,
      token,
      username: user.Username,
    });

  } catch (err) {
    console.error("LOGIN ERROR:");
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
      code: err.code || null,
      name: err.name || null,
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    });
  }
});

export default router;