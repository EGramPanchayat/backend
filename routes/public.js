import { Router } from "express";
import { imageUpload } from "../middlewares/multerConfig.js";
import { createDakhala } from "../controllers/dakhalaMagani.controller.js";
import { getQR } from "../controllers/qr.controller.js";
import { getPaymentQR } from "../controllers/dakhalaMagani.controller.js";

const router = Router();

//Form applications
router.post("/certificate-request", imageUpload.single("file"), createDakhala);


//Payment qr and general qr
router.get("/qr", getQR);
router.get("/payment-qr", getPaymentQR);

export default router;
