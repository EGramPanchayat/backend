import path from "path";
import wrapAsync from "../utils/wrapAsync.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../middlewares/cloudinaryUpload.js";
import QRSchema from "../DB/models/qrModel.js";

/** POST /upload-qr – Upload QR codes */
export const uploadQR = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const QR = conn.model("QR", QRSchema);

  let panipattiData = null;
  let gharPattiData = null;

  // check existing QR doc (we'll just update the first one)
  let qrDoc = await QR.findOne();

  // ---- Upload Panipatti QR ----
  const panipattiFile = req.files?.find(f => f.fieldname === "panipattiQR");
  if (panipattiFile) {
    if (qrDoc?.panipattiQR?.public_id) {
      await deleteFromCloudinary(qrDoc.panipattiQR.public_id);
    }
    panipattiData = await uploadToCloudinary(
      path.resolve(panipattiFile.path),
       `${req.gpName}/qrCodes`,
      "panipattiQR"
    );
  }

  // ---- Upload GharPatti QR ----
  const gharFile = req.files?.find(f => f.fieldname === "gharPattiQR");
  if (gharFile) {
    if (qrDoc?.gharPattiQR?.public_id) {
      await deleteFromCloudinary(qrDoc.gharPattiQR.public_id);
    }
    gharPattiData = await uploadToCloudinary(
      path.resolve(gharFile.path),
      `${req.gpName}/qrCodes`,
      "gharPattiQR"
    );
  }

  if (!qrDoc) qrDoc = new QR();

  if (panipattiData) qrDoc.panipattiQR = panipattiData;
  if (gharPattiData) qrDoc.gharPattiQR = gharPattiData;

  await qrDoc.save();

  res.json({ success: true, qrDoc });
});

/** GET /qr – Fetch QR codes */
export const getQR = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const QR = conn.model("QR", QRSchema);

  const qrDoc = await QR.findOne();
  res.json(qrDoc || {});
});
