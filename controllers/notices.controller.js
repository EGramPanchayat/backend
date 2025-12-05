import wrapAsync from '../utils/wrapAsync.js';
import ExpressError from '../utils/ExpressError.js';
import ParipatrakModel from '../DB/models/notices.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../middlewares/cloudinaryUploadPDF.js';
import mongoose from 'mongoose';

/** POST /notices - create a new notice (pdf optional) */
export const createNotice = wrapAsync(async (req, res) => {
  const conn = req.dbConnection || req.app?.get('dbConnection') || req.db;

  // Ensure we can construct a model bound to a potential per-request connection
  const Paripatrak = (conn && conn.model)
    ? conn.model('Paripatrak', ParipatrakModel.schema)
    : mongoose.model('Paripatrak', ParipatrakModel.schema);

  const { description } = req.body || {};
  if (!description || description.toString().trim() === '') {
    throw new ExpressError('Description is required', 400);
  }

  let pdfUrl = undefined;
  let publicId = undefined;

  // If a file was uploaded via multer, upload to Cloudinary
  if (req.file) {
    const gpName = req.headers['x-gp-name'] || req.gpName || 'default_gp';
    const folder = `${gpName}/notices`;
    const uploadRes = await uploadToCloudinary(req.file.path, folder, `notice_${Date.now()}`);
    if (!uploadRes?.url || !uploadRes?.public_id) {
      throw new ExpressError('PDF upload failed', 500);
    }
    pdfUrl = uploadRes.url;
    publicId = uploadRes.public_id;
  }

  const doc = await Paripatrak.create({
    description: description.toString().trim(),
    pdfUrl,
    publicId,
  });

  res.status(201).json({ success: true, notice: doc });
});

/** GET /notices - list notices (most recent first) */
export const getNotices = wrapAsync(async (req, res) => {
  const conn = req.dbConnection || req.app?.get('dbConnection') || req.db;
  const Paripatrak = (conn && conn.model)
    ? conn.model('Paripatrak', ParipatrakModel.schema)
    : mongoose.model('Paripatrak', ParipatrakModel.schema);

  const list = await Paripatrak.find().sort({ createdAt: -1 });
  res.json(list);
});

/** DELETE /notices/:id - delete a notice and its PDF (if exists) */
export const deleteNotice = wrapAsync(async (req, res) => {
  const conn = req.dbConnection || req.app?.get('dbConnection') || req.db;
  const Paripatrak = (conn && conn.model)
    ? conn.model('Paripatrak', ParipatrakModel.schema)
    : mongoose.model('Paripatrak', ParipatrakModel.schema);

  const { id } = req.params;
  if (!id) throw new ExpressError('Notice id is required', 400);

  const notice = await Paripatrak.findById(id);
  if (!notice) throw new ExpressError('Notice not found', 404);

  if (notice.publicId) {
    await deleteFromCloudinary(notice.publicId).catch((err) => {
      // Non-fatal: log and continue deletion from DB
      console.warn('Failed to delete from Cloudinary:', err.message || err);
    });
  }

  await Paripatrak.findByIdAndDelete(id);
  res.json({ success: true, message: 'Notice deleted' });
});
