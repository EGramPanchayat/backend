import { Router } from "express";
import { login, checkAuth, logout, refreshToken } from "../controllers/adminAuth.controller.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { imageUpload, pdfUpload } from "../middlewares/multerConfig.js";
import { changeExecutiveBoard, getExecutiveBoard } from "../controllers/executiveBoard.controller.js";
import { getDevWorks, createDevWorks, deleteDevWork } from "../controllers/developementWorks.controller.js";
import { createNews, getNews, deleteNews } from "../controllers/news.controller.js";
import { createNotice, getNotices, deleteNotice } from "../controllers/notices.controller.js";
import { uploadQR } from "../controllers/qr.controller.js";
import { uploadPaymentQR } from "../controllers/dakhalaMagani.controller.js";
import { listDakhala, deleteDakhala } from "../controllers/dakhalaMagani.controller.js";

const router = Router();

router.post("/login", login);
router.get("/check", checkAuth);
router.post("/logout", logout);
router.post("/refresh", refreshToken);

// Authentication is necessary for all the routes that lies below this line
router.use(requireAuth);

// Executive board
router.route("/executive-board")
  .get(getExecutiveBoard)
  .post(
    imageUpload.any(),
    changeExecutiveBoard
  );

//developement works
router.route("/devworks")
  .get(getDevWorks)
  .post(
    imageUpload.any(),  // Dynamic field names: works[0][image], works[1][image]...
    createDevWorks
  );
router.delete("/devworks/:id", deleteDevWork);

// news
router.route("/news")
  .get(getNews)
  .post(createNews);
router.delete("/news/:id", deleteNews);

// notices
router.route("/notices")
  .get(getNotices)
  .post(pdfUpload.single("pdfFile"), createNotice);
router.delete("/notices/:id", deleteNotice);

// qr codes
router.post(
  "/upload-qr",
  imageUpload.fields([
    { name: "panipattiQR", maxCount: 1 },
    { name: "gharPattiQR", maxCount: 1 },
    { name: "paymentQR", maxCount: 1 },
  ]),
  uploadQR
);

//payment QR
router.post("/upload-payment-qr", imageUpload.single("paymentQR"), uploadPaymentQR);

// Submissions (admin)
router.get("/submissions", listDakhala);
router.delete("/submissions/:id", deleteDakhala);

export default router;
