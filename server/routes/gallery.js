import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";

import { sql, getPool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// __dirname for ES Modules
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
      const ext = path.extname(file.originalname) || ".jpg";
      cb(
        null,
        `gallery-${Date.now()}-${Math.round(Math.random() * 1000000)}${ext}`
      );
    }
  }),

  limits: {
    fileSize:
      (parseInt(process.env.UPLOAD_MAX_MB || "5", 10)) * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, or WEBP images are allowed."));
    }

    cb(null, true);
  }
});

function mapRow(row) {
  return {
    id: row.Id,
    caption: row.Caption,
    fileName: row.FileName,
    url: row.FilePath
      ? `/uploads/${path.basename(row.FilePath)}`
      : null,
    sortOrder: row.SortOrder,
    isPublic: Boolean(row.IsPublic)
  };
}

// ----------------------------------
// PUBLIC : List Public Images
// ----------------------------------

router.get("/public", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .query(`
        SELECT *
        FROM GalleryImages
        WHERE IsPublic = 1
        ORDER BY SortOrder ASC, CreatedAt DESC
      `);

    res.json(result.recordset.map(mapRow));

  } catch (err) {
    console.error("Gallery Public List Error:", err);

    res.status(500).json({
      error: "Could not load gallery."
    });
  }
});

// ----------------------------------
// ADMIN : List All Images
// ----------------------------------

router.get("/admin", requireAuth, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .query(`
        SELECT *
        FROM GalleryImages
        ORDER BY SortOrder ASC, CreatedAt DESC
      `);

    res.json(result.recordset.map(mapRow));

  } catch (err) {
    console.error("Gallery Admin List Error:", err);

    res.status(500).json({
      error: "Could not load gallery."
    });
  }
});

// ----------------------------------
// ADMIN : Upload Image
// ----------------------------------

router.post(
  "/admin",
  requireAuth,
  upload.single("image"),
  async (req, res) => {

    if (!req.file) {
      return res.status(400).json({
        error: "No image received."
      });
    }

    const { caption, isPublic, sortOrder } = req.body || {};

    try {
      const pool = await getPool();

      await pool
        .request()
        .input("caption", sql.NVarChar, caption || null)
        .input("fileName", sql.NVarChar, req.file.originalname)
        .input("filePath", sql.NVarChar, req.file.filename)
        .input("sortOrder", sql.Int, parseInt(sortOrder, 10) || 0)
        .input("isPublic", sql.Bit, isPublic === "false" ? 0 : 1)
        .query(`
          INSERT INTO GalleryImages
          (Caption, FileName, FilePath, SortOrder, IsPublic)

          VALUES
          (@caption,@fileName,@filePath,@sortOrder,@isPublic)
        `);

      res.json({
        success: true
      });

    } catch (err) {

      console.error("Gallery Upload Error:", err);

      res.status(500).json({
        error: "Could not save image."
      });
    }
  }
);

// ----------------------------------
// ADMIN : Update Image
// ----------------------------------

router.put("/admin/:id", requireAuth, async (req, res) => {

  const { caption, isPublic, sortOrder } = req.body || {};

  try {

    const pool = await getPool();

    const result = await pool
      .request()
      .input("id", sql.Int, Number(req.params.id))
      .input("caption", sql.NVarChar, caption || null)
      .input("isPublic", sql.Bit, isPublic ? 1 : 0)
      .input("sortOrder", sql.Int, parseInt(sortOrder, 10) || 0)
      .query(`
        UPDATE GalleryImages

        SET
          Caption=@caption,
          IsPublic=@isPublic,
          SortOrder=@sortOrder

        WHERE Id=@id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        error: "Image not found."
      });
    }

    res.json({
      success: true
    });

  } catch (err) {

    console.error("Gallery Update Error:", err);

    res.status(500).json({
      error: "Could not update image."
    });
  }
});

// ----------------------------------
// ADMIN : Delete Image
// ----------------------------------

router.delete("/admin/:id", requireAuth, async (req, res) => {

  try {

    const pool = await getPool();

    const existing = await pool
      .request()
      .input("id", sql.Int, Number(req.params.id))
      .query(`
        SELECT FilePath
        FROM GalleryImages
        WHERE Id=@id
      `);

    const filePath = existing.recordset[0]?.FilePath;

    if (filePath) {

      const fullPath = path.join(
        UPLOAD_DIR,
        path.basename(filePath)
      );

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await pool
      .request()
      .input("id", sql.Int, Number(req.params.id))
      .query(`
        DELETE
        FROM GalleryImages
        WHERE Id=@id
      `);

    res.json({
      success: true
    });

  } catch (err) {

    console.error("Gallery Delete Error:", err);

    res.status(500).json({
      error: "Could not delete image."
    });
  }
});

export default router;