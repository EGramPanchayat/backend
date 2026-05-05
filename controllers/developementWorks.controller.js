import DevelopementWorkSchema from "../DB/models/developementWorks.js"; // only schema
import { uploadToCloudinary, deleteFromCloudinary } from "../middlewares/cloudinaryUpload.js";
import wrapAsync from "../utils/wrapAsync.js";
import ExpressError from "../utils/ExpressError.js";

/** GET /devworks */
export const getDevWorks = wrapAsync(async (req, res) => {
  const conn = req.dbConnection; // dynamic GP DB
  const DevelopementWork = conn.model("DevelopementWork", DevelopementWorkSchema);

  const works = await DevelopementWork.find().sort({ date: -1 });

  res.json(works);
});

/** POST /devworks */
export const createDevWorks = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const DevelopementWork = conn.model("DevelopementWork", DevelopementWorkSchema);

  const { title, description } = req.body;
  if (!title || !description) throw new ExpressError("Title and description are required", 400);

  // imageUpload.any() puts files in req.files array
  const file = req.file || (req.files && req.files[0]);
  if (!file) throw new ExpressError("Image is required", 400);

  const uploadRes = await uploadToCloudinary(
    file.path,
    `${req.gpName}/devworks`,
    `devwork_${Date.now()}`
  );
  if (!uploadRes) throw new ExpressError("Image upload failed", 500);

  const saved = await DevelopementWork.create({
    title,
    description,
    date: new Date(),
    image: { url: uploadRes.url, publicId: uploadRes.public_id },
  });

  res.status(201).json(saved);
});

/** DELETE /devworks/:ccid */
export const deleteDevWork = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const DevelopementWork = conn.model("DevelopementWork", DevelopementWorkSchema);

  const work = await DevelopementWork.findById(req.params.id);
  if (!work) throw new ExpressError("Work not found", 404);

  // Delete the Cloudinary image before removing DB record
  if (work.image?.publicId) {
    await deleteFromCloudinary(work.image.publicId);
  }

  await DevelopementWork.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});
