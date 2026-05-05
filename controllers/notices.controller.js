import wrapAsync from '../utils/wrapAsync.js';
import ExpressError from '../utils/ExpressError.js';
import ParipatrakSchema from '../DB/models/notices.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../middlewares/cloudinaryUploadPDF.js';


export const createNotice = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const Paripatrak = conn.model('Paripatrak', ParipatrakSchema);

  const { description } = req.body || {};
  if (!description || description.toString().trim() === '') {
    throw new ExpressError('Description is required', 400);
  }

  let pdfUrl = undefined;
  let publicId = undefined;

  //if pdf attached
  if (req.file) {
    const gpName = req.gpName;
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


//LIST NOTICES
export const getNotices = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const Paripatrak = conn.model('Paripatrak', ParipatrakSchema);

  const list = await Paripatrak.find().sort({ createdAt: -1 });
  res.json(list);
});


//DELETE NOTICES
export const deleteNotice = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const Paripatrak = conn.model('Paripatrak', ParipatrakSchema);

  const { id } = req.params;
  if (!id) throw new ExpressError('Notice id is required', 400);

  const notice = await Paripatrak.findById(id);
  if (!notice) throw new ExpressError('Notice not found', 404);

  if (notice.publicId) {
    await deleteFromCloudinary(notice.publicId).catch((err) => {
      console.warn('Failed to delete from Cloudinary:', err.message || err);
    });
  }

  await Paripatrak.findByIdAndDelete(id);
  res.json({ success: true, message: 'Notice deleted' });
});
