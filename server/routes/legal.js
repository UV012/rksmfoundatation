const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { sql, getPool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const safeId = req.params.id.replace(/[^a-z0-9]/gi, '');
      const ext = path.extname(file.originalname) || '.pdf';
      cb(null, `${safeId}-${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: (parseInt(process.env.UPLOAD_MAX_MB || '5', 10)) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed.'));
    }
    cb(null, true);
  }
});

function mapRow(row) {
  return {
    id: row.Id,
    icon: row.Icon,
    title: row.Title,
    description: row.Description,
    regNumber: row.RegNumber,
    regDate: row.RegDate,
    validity: row.Validity,
    fileName: row.FileName,
    hasFile: !!row.FilePath,
    isPublic: !!row.IsPublic,
    updatedAt: row.UpdatedAt
  };
}

// ---- PUBLIC: list only publicly-visible registrations ----
router.get('/public', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM LegalRegistrations WHERE IsPublic = 1 ORDER BY Id');
    res.json(result.recordset.map(mapRow));
  } catch (err) {
    console.error('Public list error:', err);
    res.status(500).json({ error: 'Could not load registration details.' });
  }
});

// ---- PUBLIC: download a certificate PDF (only if marked public) ----
router.get('/public/:id/file', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT FilePath, FileName, IsPublic FROM LegalRegistrations WHERE Id = @id');

    const row = result.recordset[0];
    if (!row || !row.IsPublic || !row.FilePath) {
      return res.status(404).json({ error: 'Certificate not available.' });
    }

    const fullPath = path.join(UPLOAD_DIR, path.basename(row.FilePath));
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File missing on server.' });
    }
    res.download(fullPath, row.FileName || 'certificate.pdf');
  } catch (err) {
    console.error('Public file error:', err);
    res.status(500).json({ error: 'Could not fetch file.' });
  }
});

// ---- ADMIN: list all registrations (public + private) ----
router.get('/admin', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM LegalRegistrations ORDER BY Id');
    res.json(result.recordset.map(mapRow));
  } catch (err) {
    console.error('Admin list error:', err);
    res.status(500).json({ error: 'Could not load registration details.' });
  }
});

// ---- ADMIN: update a registration's text fields / visibility ----
router.put('/admin/:id', requireAuth, async (req, res) => {
  const { regNumber, regDate, validity, description, isPublic } = req.body || {};
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('regNumber', sql.NVarChar, regNumber || null)
      .input('regDate', sql.Date, regDate || null)
      .input('validity', sql.NVarChar, validity || null)
      .input('description', sql.NVarChar, description || null)
      .input('isPublic', sql.Bit, isPublic ? 1 : 0)
      .query(`UPDATE LegalRegistrations SET
                RegNumber = @regNumber,
                RegDate = @regDate,
                Validity = @validity,
                Description = @description,
                IsPublic = @isPublic,
                UpdatedAt = SYSUTCDATETIME()
              WHERE Id = @id`);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Registration record not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Could not save changes.' });
  }
});

// ---- ADMIN: upload / replace a certificate PDF ----
router.post('/admin/:id/file', requireAuth, upload.single('certificate'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file received.' });
  }
  try {
    const pool = await getPool();

    // Remove old file from disk if one exists
    const existing = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT FilePath FROM LegalRegistrations WHERE Id = @id');

    const oldPath = existing.recordset[0] && existing.recordset[0].FilePath;
    if (oldPath) {
      const oldFull = path.join(UPLOAD_DIR, path.basename(oldPath));
      if (fs.existsSync(oldFull)) fs.unlinkSync(oldFull);
    }

    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('fileName', sql.NVarChar, req.file.originalname)
      .input('filePath', sql.NVarChar, req.file.filename)
      .query(`UPDATE LegalRegistrations SET
                FileName = @fileName,
                FilePath = @filePath,
                UpdatedAt = SYSUTCDATETIME()
              WHERE Id = @id`);

    res.json({ success: true, fileName: req.file.originalname });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Could not save uploaded file.' });
  }
});

// ---- ADMIN: remove a certificate file ----
router.delete('/admin/:id/file', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const existing = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT FilePath FROM LegalRegistrations WHERE Id = @id');

    const oldPath = existing.recordset[0] && existing.recordset[0].FilePath;
    if (oldPath) {
      const oldFull = path.join(UPLOAD_DIR, path.basename(oldPath));
      if (fs.existsSync(oldFull)) fs.unlinkSync(oldFull);
    }

    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('UPDATE LegalRegistrations SET FileName = NULL, FilePath = NULL, UpdatedAt = SYSUTCDATETIME() WHERE Id = @id');

    res.json({ success: true });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ error: 'Could not remove file.' });
  }
});

// ---- ADMIN: download any certificate (public or private) for review ----
router.get('/admin/:id/file', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT FilePath, FileName FROM LegalRegistrations WHERE Id = @id');

    const row = result.recordset[0];
    if (!row || !row.FilePath) {
      return res.status(404).json({ error: 'No file uploaded for this record.' });
    }
    const fullPath = path.join(UPLOAD_DIR, path.basename(row.FilePath));
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File missing on server.' });
    }
    res.download(fullPath, row.FileName || 'certificate.pdf');
  } catch (err) {
    console.error('Admin file error:', err);
    res.status(500).json({ error: 'Could not fetch file.' });
  }
});

module.exports = router;
