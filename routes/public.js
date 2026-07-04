import { Router } from "express";
import { imageUpload } from "../middlewares/multerConfig.js";
import { createDakhala } from "../controllers/dakhalaMagani.controller.js";
import { getQR } from "../controllers/qr.controller.js";
import { getNews } from "../controllers/news.controller.js";
import { getNotices } from "../controllers/notices.controller.js";
import { getExecutiveBoard } from "../controllers/executiveBoard.controller.js";
import { getDevWorks } from "../controllers/developementWorks.controller.js";
import { getSiteConfig } from "../controllers/siteConfig.controller.js";
import { getGovOfficials } from "../controllers/govOfficials.controller.js";

// VMS controllers
import { requestOtp, verifyOtp, checkUserAuth, logoutUser } from "../controllers/userAuth.controller.js";
import { lookupFamily } from "../controllers/family.controller.js";
import { createRazorpayOrder, verifyRazorpayPayment, getFamilyTaxes } from "../controllers/tax.controller.js";
import { submitApplication, getUserApplications } from "../controllers/application.controller.js";
import { requireUserAuth, requireAdminOrUserAuth } from "../middlewares/authMiddleware.js";

const router = Router();

// Public content endpoints (no auth required)
router.get("/site-config", getSiteConfig);
router.get("/gov-officials", getGovOfficials);
router.get("/news", getNews);
router.get("/notices", getNotices);
router.get("/devworks", getDevWorks);
router.get("/executive-board", getExecutiveBoard);

// Payment QR and general QR
router.get("/qr", getQR);

// Form applications (public submission)
router.post("/certificate-request", imageUpload.single("file"), createDakhala);

// Public VMS Lookup & Payments
router.get("/family/lookup/:familyId", lookupFamily);
router.post("/payments/order", createRazorpayOrder);
router.post("/payments/verify", verifyRazorpayPayment);

// Public VMS OTP Auth
router.post("/auth/otp/request", requestOtp);
router.post("/auth/otp/verify", verifyOtp);
router.get("/auth/otp/check", checkUserAuth);
router.post("/auth/otp/logout", logoutUser);

// Villager Protected Endpoints (need requireUserAuth)
router.post("/user/applications", requireUserAuth, submitApplication);
router.get("/user/applications", requireUserAuth, getUserApplications);

// Shared Admin/Villager Dues Endpoint
router.get("/taxes/:familyId", requireAdminOrUserAuth, getFamilyTaxes);

export default router;

