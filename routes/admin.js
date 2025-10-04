import { Router } from "express";
import { login, checkAuth, logout } from "../controllers/adminAuth.controller.js";
import { upload } from "../middlewares/multerMiddleWare.js";
import { upsertExecutiveBoard, getExecutiveBoard } from "../controllers/executiveBoard.controller.js";
import { getDevWorks, createDevWorks, deleteDevWork } from "../controllers/developementWorks.controller.js";
import { createNews, getNews, deleteNews } from "../controllers/news.controller.js";
import { uploadQR, getQR } from "../controllers/qr.controller.js";

const router = Router();

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




router.post("/upload-qr", upload.any(), uploadQR);
router.get("/qr", getQR);


export default router;
