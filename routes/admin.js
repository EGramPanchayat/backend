import { Router } from "express";
import { login, checkAuth, logout, refreshToken } from "../controllers/adminAuth.controller.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { imageUpload, pdfUpload } from "../middlewares/multerConfig.js";
import { changeExecutiveBoard } from "../controllers/executiveBoard.controller.js";
import { createDevWorks, deleteDevWork } from "../controllers/developementWorks.controller.js";
import { createNews, deleteNews } from "../controllers/news.controller.js";
import { createNotice, deleteNotice } from "../controllers/notices.controller.js";

import { listDakhala, deleteDakhala } from "../controllers/dakhalaMagani.controller.js";
import { upsertGovOfficials } from "../controllers/govOfficials.controller.js";
import { updateSiteConfig } from "../controllers/siteConfig.controller.js";

// VMS controllers
import { getFamilies, createFamily, updateFamily, deleteFamily } from "../controllers/family.controller.js";
import { assignTax, recordOfflinePayment, recordCategoryOfflinePayment, getPaymentsLogs, getGlobalTaxStats, bulkReleaseTaxes, getTaxSchedule, toggleTaxSchedule, getPendingFamiliesForYear } from "../controllers/tax.controller.js";
import { getAdminApplications, updateApplicationStatus } from "../controllers/application.controller.js";
import { getAdminNotifications } from "../controllers/notification.controller.js";

const router = Router();

// Auth routes (no requireAuth)
router.post("/login", login);
router.get("/check", checkAuth);
router.post("/logout", logout);
router.post("/refresh", refreshToken);

// Authentication is necessary for all the routes below this line
router.use(requireAuth);

// Executive board (admin write)
router.post("/executive-board", imageUpload.any(), changeExecutiveBoard);

router.post("/gov-officials", imageUpload.any(), upsertGovOfficials);

router.post("/site-config", updateSiteConfig);

// Development works (admin write/delete)
router.post("/devworks", imageUpload.any(), createDevWorks);
router.delete("/devworks/:id", deleteDevWork);

// News (admin write/delete)
router.post("/news", createNews);
router.delete("/news/:id", deleteNews);

// Notices (admin write/delete)
router.post("/notices", pdfUpload.single("pdfFile"), createNotice);
router.delete("/notices/:id", deleteNotice);




// Submissions (admin)
router.get("/submissions", listDakhala);
router.delete("/submissions/:id", deleteDakhala);

// VMS Families CRUD
router.get("/families", getFamilies);
router.post("/families", createFamily);
router.put("/families/:id", updateFamily);
router.delete("/families/:id", deleteFamily);

// VMS Taxes & Payments
router.post("/taxes/assign", assignTax);
router.post("/payments/offline", recordOfflinePayment);
router.post("/payments/offline-category", recordCategoryOfflinePayment);
router.get("/payments/logs", getPaymentsLogs);
router.get("/taxes/stats", getGlobalTaxStats);
router.post("/taxes/bulk-release", bulkReleaseTaxes);
router.get("/taxes/schedule", getTaxSchedule);
router.post("/taxes/schedule/toggle", toggleTaxSchedule);
router.get("/taxes/pending-families/:year", getPendingFamiliesForYear);

// VMS User Certificate Applications
router.get("/applications", getAdminApplications);
router.post("/applications/:id/status", updateApplicationStatus);

// Notifications
router.get("/notifications", getAdminNotifications);

export default router;
