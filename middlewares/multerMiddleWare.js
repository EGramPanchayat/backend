import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const tempDir = path.join(process.cwd(), "public", "tempMulter");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, tempDir),
  filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!ok.includes(file.mimetype)) return cb(new Error("Invalid image type"), false);
    cb(null, true);
  },
});
