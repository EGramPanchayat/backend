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

  const works = Array.isArray(req.body.works) ? req.body.works : [];
  const groupedFiles = {};

  (req.files || []).forEach(file => {
    const m = file.fieldname.match(/works\[(\d+)\]\[image\]/);
    if (m) groupedFiles[m[1]] = file;
  });

  const worksToSave = [];

  for (let i = 0; i < works.length; i++) {
    const w = works[i];
    if (!w.title || !w.description) continue;

    let image = { url: "", publicId: "" };

    if (groupedFiles[i]) {
      const uploadRes = await uploadToCloudinary(
        groupedFiles[i].path,
        `${req.gpName}/devworks`,
        `devwork_${Date.now()}`
      );
      if (!uploadRes) throw new ExpressError("Image upload failed", 500);
      image = { url: uploadRes.url, publicId: uploadRes.public_id };
    } else {
      throw new ExpressError("Image is required for each work", 400);
    }

    worksToSave.push({
      title: w.title,
      description: w.description,
      date: new Date(),
      image
    });
  }

  if (!worksToSave.length) throw new ExpressError("No valid works provided", 400);

  const saved = await DevelopementWork.insertMany(worksToSave);
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
