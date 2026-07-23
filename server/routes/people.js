import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";

import { sql, getPool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const VALID_CATEGORIES = [
  "advisory_council",
  "volunteer",
  "brand_ambassador"
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `person-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    }
  }),
  limits: { fileSize: (parseInt(process.env.UPLOAD_MAX_MB || '5', 10)) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, or WEBP images are allowed.'));
    }
    cb(null, true);
  }
});

function mapRow(row) {
  return {
    id: row.Id,
    category: row.Category,
    name: row.Name,
    role: row.Role,
    bio: row.Bio,
    photoUrl: row.PhotoFilePath ? `/uploads/${path.basename(row.PhotoFilePath)}` : null,
    sortOrder: row.SortOrder,
    isPublic: !!row.IsPublic
  };
}

function checkCategory(req, res, next) {
  if (req.params.category && !VALID_CATEGORIES.includes(req.params.category)) {
    return res.status(400).json({ error: 'Invalid category.' });
  }
  next();
}

// ---- PUBLIC: list public members by category ----
router.get('/public/:category', checkCategory, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('category', sql.NVarChar, req.params.category)
      .query('SELECT * FROM TeamMembers WHERE Category = @category AND IsPublic = 1 ORDER BY SortOrder ASC, Id ASC');
    res.json(result.recordset.map(mapRow));
  } catch (err) {
    console.error('People public list error:', err);
    res.status(500).json({ error: 'Could not load list.' });
  }
});

// ---- ADMIN: list all members (any category) ----
router.get('/admin', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM TeamMembers ORDER BY Category, SortOrder ASC, Id ASC');
    res.json(result.recordset.map(mapRow));
  } catch (err) {
    console.error('People admin list error:', err);
    res.status(500).json({ error: 'Could not load list.' });
  }
});

// ---- ADMIN: add a member (with optional photo) ----
router.post('/admin', requireAuth, upload.single('photo'), async (req, res) => {
  const { category, name, role, bio, isPublic, sortOrder } = req.body || {};
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid or missing category.' });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  try {
    const pool = await getPool();
    await pool.request()
      .input('category', sql.NVarChar, category)
      .input('name', sql.NVarChar, name.trim())
      .input('role', sql.NVarChar, role || null)
      .input('bio', sql.NVarChar, bio || null)
      .input('photoFileName', sql.NVarChar, req.file ? req.file.originalname : null)
      .input('photoFilePath', sql.NVarChar, req.file ? req.file.filename : null)
      .input('sortOrder', sql.Int, parseInt(sortOrder, 10) || 0)
      .input('isPublic', sql.Bit, isPublic === 'false' ? 0 : 1)
      .query(`INSERT INTO TeamMembers (Category, Name, Role, Bio, PhotoFileName, PhotoFilePath, SortOrder, IsPublic)
              VALUES (@category, @name, @role, @bio, @photoFileName, @photoFilePath, @sortOrder, @isPublic)`);
    res.json({ success: true });
  } catch (err) {
    console.error('People add error:', err);
    res.status(500).json({ error: 'Could not add member.' });
  }
});

// ---- ADMIN: update a member's details ----
router.put('/admin/:id', requireAuth, async (req, res) => {
  const { name, role, bio, isPublic, sortOrder } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('name', sql.NVarChar, name.trim())
      .input('role', sql.NVarChar, role || null)
      .input('bio', sql.NVarChar, bio || null)
      .input('isPublic', sql.Bit, isPublic ? 1 : 0)
      .input('sortOrder', sql.Int, parseInt(sortOrder, 10) || 0)
      .query(`UPDATE TeamMembers SET Name=@name, Role=@role, Bio=@bio, IsPublic=@isPublic,
              SortOrder=@sortOrder, UpdatedAt=SYSUTCDATETIME() WHERE Id=@id`);
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Member not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('People update error:', err);
    res.status(500).json({ error: 'Could not update member.' });
  }
});

// ---- ADMIN: replace a member's photo ----
router.post('/admin/:id/photo', requireAuth, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No photo received.' });
  try {
    const pool = await getPool();
    const existing = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT PhotoFilePath FROM TeamMembers WHERE Id = @id');

    const oldPath = existing.recordset[0] && existing.recordset[0].PhotoFilePath;
    if (oldPath) {
      const oldFull = path.join(UPLOAD_DIR, path.basename(oldPath));
      if (fs.existsSync(oldFull)) fs.unlinkSync(oldFull);
    }

    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('photoFileName', sql.NVarChar, req.file.originalname)
      .input('photoFilePath', sql.NVarChar, req.file.filename)
      .query(`UPDATE TeamMembers SET PhotoFileName=@photoFileName, PhotoFilePath=@photoFilePath,
              UpdatedAt=SYSUTCDATETIME() WHERE Id=@id`);
    res.json({ success: true });
  } catch (err) {
    console.error('People photo error:', err);
    res.status(500).json({ error: 'Could not save photo.' });
  }
});

// ---- ADMIN: delete a member ----
router.delete('/admin/:id', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const existing = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT PhotoFilePath FROM TeamMembers WHERE Id = @id');

    const photoPath = existing.recordset[0] && existing.recordset[0].PhotoFilePath;
    if (photoPath) {
      const fullPath = path.join(UPLOAD_DIR, path.basename(photoPath));
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM TeamMembers WHERE Id = @id');
    res.json({ success: true });
  } catch (err) {
    console.error('People delete error:', err);
    res.status(500).json({ error: 'Could not delete member.' });
  }
});

export default router;
