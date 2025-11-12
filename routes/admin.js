import { Router } from "express";
import pdfUpload from '../middlewares/pdfMulter.js';
import { login, checkAuth, logout } from "../controllers/adminAuth.controller.js";
import { upload } from "../middlewares/multerMiddleWare.js";
import { upsertExecutiveBoard, getExecutiveBoard } from "../controllers/executiveBoard.controller.js";
import { getDevWorks, createDevWorks, deleteDevWork } from "../controllers/developementWorks.controller.js";
import { createNews, getNews, deleteNews } from "../controllers/news.controller.js";
import { createNotice, getNotices, deleteNotice } from "../controllers/notices.controller.js";
import { uploadQR, getQR } from "../controllers/qr.controller.js";
import { uploadPaymentQR, getPaymentQR } from '../controllers/dakhalaMagani.controller.js';
import { createDakhala,listDakhala, deleteDakhala } from "../controllers/dakhalaMagani.controller.js";


const router = Router();

// pdfUpload (multer instance configured for PDFs) imported from middleware

// ---- Auth ----
router.post("/login", login);
router.get("/check", checkAuth);
router.post("/logout", logout);

// ---- Existing routes ----
router.route("/exboard-karyakari-mandal")
  .post(upload.any(), upsertExecutiveBoard)
  .get(getExecutiveBoard);
  



router.route("/devworks")
  .get(getDevWorks)
  .post(upload.any(), createDevWorks);

router.delete("/devworks/:id", deleteDevWork);

router.route("/news")
  .get(getNews)
  .post(createNews);

router.delete("/news/:id", deleteNews);


router.route('/notices')
  .get(getNotices)
  .post(pdfUpload.single('pdfFile'), createNotice);

router.delete('/notices/:id', deleteNotice);






// Public submission endpoint
router.post(
  "/dakhala-magani",
  upload.single("file"),
  createDakhala
);

router.post("/upload-qr", upload.any(), uploadQR);
router.get("/qr", getQR);

// Payment QR endpoints (single payment QR)
router.post('/upload-payment-qr', upload.single('paymentQR'), uploadPaymentQR);
router.get('/payment-qr', getPaymentQR);

// Dakhala Magani submissions (admin)
router.get('/dakhala', listDakhala);
router.delete('/dakhala/:id', deleteDakhala);


export default router;
