import { Router } from "express";
import { imageUpload } from "../middlewares/multerConfig.js";
import { createDakhala } from "../controllers/dakhalaMagani.controller.js";
import { getQR } from "../controllers/qr.controller.js";
import { getNews } from "../controllers/news.controller.js";
import { getNotices } from "../controllers/notices.controller.js";
import { getExecutiveBoard } from "../controllers/executiveBoard.controller.js";
import { getDevWorks } from "../controllers/developementWorks.controller.js";

const router = Router();

// Public content endpoints (no auth required)
router.get("/news", getNews);
router.get("/notices", getNotices);
router.get("/devworks", getDevWorks);
router.get("/executive-board", getExecutiveBoard);

// Payment QR and general QR
router.get("/qr", getQR);

// Form applications (public submission)
router.post("/certificate-request", imageUpload.single("file"), createDakhala);

export default router;
