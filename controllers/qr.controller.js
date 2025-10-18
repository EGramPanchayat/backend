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
  let paymentData = null;

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

  // ---- Upload Payment QR ----
  const paymentFile = req.files?.find(f => f.fieldname === "paymentQR");
  if (paymentFile) {
    if (qrDoc?.paymentQR?.publicId) {
      await deleteFromCloudinary(qrDoc.paymentQR.publicId);
    }
    paymentData = await uploadToCloudinary(
      path.resolve(paymentFile.path),
      `${req.gpName}/qrCodes`,
      "paymentQR"
    );
  }

  if (!qrDoc) qrDoc = new QR();

  if (panipattiData) qrDoc.panipattiQR = { url: panipattiData.url, publicId: panipattiData.public_id || panipattiData.publicId };
  if (gharPattiData) qrDoc.gharPattiQR = { url: gharPattiData.url, publicId: gharPattiData.public_id || gharPattiData.publicId };
  if (paymentData) qrDoc.paymentQR = { url: paymentData.url, publicId: paymentData.public_id || paymentData.publicId };

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
