import { Router } from "express";
import { imageUpload } from "../middlewares/multerConfig.js";
import { createDakhala } from "../controllers/dakhalaMagani.controller.js";

import { getNews } from "../controllers/news.controller.js";
import { getNotices } from "../controllers/notices.controller.js";
import { getExecutiveBoard } from "../controllers/executiveBoard.controller.js";
import { getDevWorks } from "../controllers/developementWorks.controller.js";
import { getSiteConfig } from "../controllers/siteConfig.controller.js";
import { getGovOfficials } from "../controllers/govOfficials.controller.js";

// VMS controllers
import { requestOtp, verifyOtp, refreshUserToken, checkUserAuth, logoutUser, requestOtpByQr } from "../controllers/userAuth.controller.js";
import { lookupFamily, qrPartialLookup } from "../controllers/family.controller.js";
import { createRazorpayOrder, verifyRazorpayPayment, getFamilyTaxes } from "../controllers/tax.controller.js";
import { submitApplication, getUserApplications, updateUserApplication } from "../controllers/application.controller.js";
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from "../controllers/notification.controller.js";
import { requireUserAuth, requireAdminOrUserAuth, requireAuth } from "../middlewares/authMiddleware.js";
import { bookUpload } from "../middlewares/multerConfig.js";
import {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  downloadBook,
  getBookStats
} from "../controllers/book.controller.js";

const router = Router();

// Public content endpoints (no auth required)
router.get("/site-config", getSiteConfig);
router.get("/gov-officials", getGovOfficials);
router.get("/news", getNews);
router.get("/notices", getNotices);
router.get("/devworks", getDevWorks);
router.get("/executive-board", getExecutiveBoard);



// Form applications (public submission)
router.post("/certificate-request", imageUpload.single("file"), createDakhala);

// Public VMS Lookup & Payments
router.get("/family/lookup/:familyId", lookupFamily);
router.get("/family/qr-lookup/:familyId", qrPartialLookup);
router.post("/payments/order", createRazorpayOrder);
router.post("/payments/verify", verifyRazorpayPayment);

// Public VMS OTP Auth
router.post("/auth/otp/request", requestOtp);
router.post("/auth/otp/request-by-qr", requestOtpByQr);
router.post("/auth/otp/verify", verifyOtp);
router.post("/auth/otp/refresh", refreshUserToken);
router.get("/auth/otp/check", checkUserAuth);
router.post("/auth/otp/logout", logoutUser);

// Villager Protected Endpoints (need requireUserAuth)
router.post("/user/applications", requireUserAuth, submitApplication);
router.get("/user/applications", requireUserAuth, getUserApplications);
router.put("/user/applications/:id", requireUserAuth, updateUserApplication);

// Villager Notifications
router.get("/user/notifications", requireUserAuth, getUserNotifications);
router.patch("/user/notifications/:id/read", requireUserAuth, markNotificationRead);
router.patch("/user/notifications/read-all", requireUserAuth, markAllNotificationsRead);

// Shared Admin/Villager Dues Endpoint
router.get("/taxes/:familyId", requireAdminOrUserAuth, getFamilyTaxes);

// eLibrary Book routes
router.get("/books/stats", getBookStats);
router.get("/books", getAllBooks);
router.get("/books/:id", getBookById);
router.get("/books/download/:id", downloadBook);
router.post("/books", requireAuth, bookUpload, createBook);
router.put("/books/:id", requireAuth, bookUpload, updateBook);
router.delete("/books/:id", requireAuth, deleteBook);

export default router;

