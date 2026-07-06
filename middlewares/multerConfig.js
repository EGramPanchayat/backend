import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const TEMP_DIR = path.join(process.cwd(), "public", "tempMulter");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMP_DIR),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});


export const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed"), false);
    }
  },
});


export const pdfUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

export const bookUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit for pdf + cover
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === "coverImage") {
      const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed for coverImage"), false);
      }
    } else if (file.fieldname === "pdfFile") {
      if (file.mimetype === "application/pdf") {
        cb(null, true);
      } else {
        cb(new Error("Only PDF files are allowed for pdfFile"), false);
      }
    } else {
      cb(null, true);
    }
  }
}).fields([
  { name: "coverImage", maxCount: 1 },
  { name: "pdfFile", maxCount: 1 }
]);

export function cleanTempFiles(files) {
  const list = Array.isArray(files) ? files : [files];
  for (const f of list) {
    if (f?.path && fs.existsSync(f.path)) {
      try { fs.unlinkSync(f.path); } catch { }
    }
  }
}
