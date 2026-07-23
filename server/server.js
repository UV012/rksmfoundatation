import dotenv from "dotenv";
dotenv.config();



import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import legalRoutes from "./routes/legal.js";
import galleryRoutes from "./routes/gallery.js";
import peopleRoutes from "./routes/people.js";
import statsRoutes from "./routes/stats.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Simple CORS
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: res => {
      res.setHeader("Cache-Control", "public, max-age=86400");
    }
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/legal", legalRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/people", peopleRoutes);
app.use("/api/stats", statsRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "RKSF API Running"
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found"
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});