require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const legalRoutes = require('./routes/legal');
const galleryRoutes = require('./routes/gallery');
const peopleRoutes = require('./routes/people');
const statsRoutes = require('./routes/stats');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : '*',
  credentials: true
}));

app.use(express.json());

// Serve gallery/team photos directly — these are always meant to be public.
// Certificate PDFs live in a SEPARATE folder (private-uploads/, used only by
// routes/legal.js) which is never mounted here, so private certificates
// can't be reached by guessing a URL — only via the auth-gated /api/legal
// routes, which check IsPublic before serving.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=86400')
}));

app.use('/api/auth', authRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Multer / generic error handler
app.use((err, req, res, next) => {
  if (err) {
    console.error(err);
    return res.status(400).json({ error: err.message || 'Something went wrong.' });
  }
  next();
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`RKSF Legal API running on port ${PORT}`);
});
