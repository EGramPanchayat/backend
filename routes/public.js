import { Router } from "express";
import { imageUpload } from "../middlewares/multerConfig.js";
import { createDakhala } from "../controllers/dakhalaMagani.controller.js";
import { getQR } from "../controllers/qr.controller.js";
import { getPaymentQR } from "../controllers/dakhalaMagani.controller.js";
import { getNews } from "../controllers/news.controller.js";
import { getNotices } from "../controllers/notices.controller.js";
import {  getExecutiveBoard } from "../controllers/executiveBoard.controller.js";
import { getDevWorks} from "../controllers/developementWorks.controller.js";


const router = Router();

//Form applications
router.post("/certificate-request", imageUpload.single("file"), createDakhala);


router.route("/devworks")
      .get(getDevWorks)


router.get("/news", getNews);


router.get("/notices", getNotices);

// Public content endpoints


// Payment qr and general qr
router.get("/qr", getQR);
router.get("/payment-qr", getPaymentQR);


// Executive board
router.get("/executive-board", getExecutiveBoard)


export default router;
