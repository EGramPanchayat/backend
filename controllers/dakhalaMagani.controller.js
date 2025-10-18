import wrapAsync from '../utils/wrapAsync.js';
import ExpressError from '../utils/ExpressError.js';
import DakhalaSchema from '../DB/models/dakhalaMagani.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../middlewares/cloudinaryUpload.js';
import path from 'path';
import QRSchema from '../DB/models/qrModel.js';


// ✅ POST /janmacha-dakhala - create new submission
export const createDakhala = wrapAsync(async (req, res) => {



  const conn = req.dbConnection || req.app?.get('dbConnection') || req.db;
  const Dakhala =
    (conn && conn.model)
      ? conn.model('DakhalaMagani', DakhalaSchema)
      : (await import('mongoose')).default.model('DakhalaMagani', DakhalaSchema);

  if (!req.body) throw new ExpressError('Request body missing or invalid', 400);
  const payload = req.body;

  // Required fields from frontend
  const required = ['forName', 'email', 'type', 'whatsappNo'];
  for (const f of required) {
    if (!payload[f] || payload[f].toString().trim() === '') {
      throw new ExpressError(`${f} is required`, 400);
    }
  }

  // WhatsApp number validation (10 digits only)
  const mobileRegex = /^[0-9]{10}$/;
  if (!mobileRegex.test(payload.whatsappNo)) {
    throw new ExpressError('WhatsApp number must be 10 digits', 400);
  }

  // Payment screenshot required for certain types
  // Match the frontend Marathi certificate type strings
  const FEE_REQUIRED_TYPES = [
    'जन्म नोंद',
    'मृत्यू नोंद',
    'विवाह नोंदणी दाखला',
    '८ अ उतारा',
    'ग्रामपंचायत येणे बाकी दाखला'
  ];

  let paymentImg = undefined;


  if (FEE_REQUIRED_TYPES.includes(payload.type)) {
    if (!req.file) {
      throw new ExpressError('Payment screenshot is required for this certificate type', 400);
    }

    // Upload payment image to Cloudinary
  const gpName = req.headers['x-gp-name'] || 'default_gp';
    const folder = `${gpName}/dakhalaPayments`;
    const uploadRes = await uploadToCloudinary(
      req.file.path,
      folder,
      `payment_${payload.forName || 'unknown'}`
    );

    if (!uploadRes?.url || !uploadRes?.public_id) {
      throw new ExpressError('Image upload failed. Please try again.', 500);
    }
    paymentImg = { url: uploadRes.url, publicId: uploadRes.public_id };

  } else if (req.file) {
    // If file is uploaded for fee-exempt type, still upload and store
    const gpName = req.headers['x-gp-name'] || 'default_gp';
    const folder = `${gpName}/dakhalaPayments`;
    const uploadRes = await uploadToCloudinary(
      req.file.path,
      folder,
      `payment_${payload.forName || 'unknown'}`
    );

    if (uploadRes?.url && uploadRes?.public_id) {
      paymentImg = { url: uploadRes.url, publicId: uploadRes.public_id };
    }
  }

  // Build the document
  const doc = {
    forName: payload.forName,
    whatsappNo: payload.whatsappNo,
    email: payload.email,
    type: payload.type,
    dob: payload.dob,
    childName: payload.childName,
    deathName: payload.deathName,
    deathDate: payload.deathDate,
    coupleName: payload.coupleName,
    marriageYear: payload.marriageYear,
    propertyNo: payload.propertyNo,
    certificateName: payload.certificateName,
    niradharName: payload.niradharName,
  };

  if (paymentImg) doc.paymentImg = paymentImg;

  const created = await Dakhala.create(doc);

  res.status(201).json({
    success: true,
    id: created._id,
    message: 'Submission received successfully ✅',
  });
});


// ✅ GET /api/admin/dakhala - list submissions
export const listDakhala = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const Dakhala = conn.model('DakhalaMagani', DakhalaSchema);

  const subs = await Dakhala.find().sort({ createdAt: -1 });
  const safeSubs = subs.map((s) => ({
    _id: s._id,
    forName: s.forName ?? '',
    email: s.email ?? '',
    type: s.type ?? '',
    childName: s.childName ?? '',
    dob: s.dob ?? '',
    deathName: s.deathName ?? '',
    deathDate: s.deathDate ?? '',
    coupleName: s.coupleName ?? '',
    marriageYear: s.marriageYear ?? '',
    propertyNo: s.propertyNo ?? '',
    niradharName: s.niradharName ?? '',
    whatsappNo: s.whatsappNo ?? '',
    certificateName: s.certificateName ?? '',
    paymentImg: s.paymentImg ?? { url: '', publicId: '' },
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));

  res.json(safeSubs);
});


// ✅ DELETE /api/admin/dakhala/:id
export const deleteDakhala = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const Dakhala = conn.model('DakhalaMagani', DakhalaSchema);
  const { id } = req.params;

  const d = await Dakhala.findById(id);
  if (!d) throw new ExpressError('Submission not found', 404);

  // Delete image from Cloudinary if exists
  if (d.paymentImg?.publicId) {
    await deleteFromCloudinary(d.paymentImg.publicId);
  }

  await Dakhala.findByIdAndDelete(id);
  res.json({ success: true, message: 'Record deleted successfully ✅' });
});


// ---- Payment QR management (upload/get) ----
export const uploadPaymentQR = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const QR = conn.model('QR', QRSchema);
  let qrDoc = await QR.findOne();

  const paymentFile = req.file || req.files?.find(f => f.fieldname === 'paymentQR');
  if (!paymentFile) throw new ExpressError('No file uploaded', 400);

  if (qrDoc?.paymentQR?.publicId) {
    await deleteFromCloudinary(qrDoc.paymentQR.publicId);
  }

  const uploaded = await uploadToCloudinary(path.resolve(paymentFile.path), `${req.gpName || 'default_gp'}/qrCodes`, 'paymentQR');
  if (!uploaded?.url) throw new ExpressError('Upload failed', 500);

  if (!qrDoc) qrDoc = new QR();
  qrDoc.paymentQR = { url: uploaded.url, publicId: uploaded.public_id || uploaded.publicId };
  await qrDoc.save();
  res.json({ success: true, qrDoc });
});

export const getPaymentQR = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const QR = conn.model('QR', QRSchema);
  const qrDoc = await QR.findOne();

  res.json(qrDoc?.paymentQR || {});
});
