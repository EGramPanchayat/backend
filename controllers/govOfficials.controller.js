import wrapAsync from "../utils/wrapAsync.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../middlewares/cloudinaryUpload.js";
import GovernmentOfficialSchema from "../DB/models/governmentOfficial.js";

// GET — Public: return all government officials ordered by `order`
export const getGovOfficials = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const GovOfficial = conn.model("GovernmentOfficial", GovernmentOfficialSchema);

  const officials = await GovOfficial.find().sort({ order: 1 });
  res.json(officials);
});

// POST — Admin: replace entire officials list (similar to executive board pattern)
export const upsertGovOfficials = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const GovOfficial = conn.model("GovernmentOfficial", GovernmentOfficialSchema);

  const officials = req.body.officials || [];

  // Get existing officials for cleanup
  const existing = await GovOfficial.find();
  const existingMap = {};
  for (const o of existing) {
    existingMap[o._id.toString()] = o;
  }

  // Track which existing IDs are still present
  const incomingIds = new Set();

  const uploadSingle = (file, name) =>
    uploadToCloudinary(file.path, `${req.gpName}/govOfficials`, name);

  // Build result array
  const result = [];

  for (let i = 0; i < officials.length; i++) {
    const o = officials[i];

    if (!o.name && !o.role) continue; // skip empty rows

    const data = {
      name: o.name || "",
      role: o.role || "",
      order: i,
      image: o.image || "/images/profile.png",
      imageId: o.imageId || "",
    };

    // If it's an existing official, preserve its image unless a new one is uploaded
    if (o._id && existingMap[o._id]) {
      incomingIds.add(o._id);
      const ex = existingMap[o._id];
      data.image = o.image || ex.image;
      data.imageId = o.imageId || ex.imageId;
    }

    result.push({ ...data, _tempId: o._id || `new_${i}` });
  }

  // Handle file uploads
  // Frontend sends files as: officialImages[<_id or tempId>]
  for (const file of req.files || []) {
    const fname = file.fieldname;
    if (fname.startsWith("officialImages[")) {
      const id = fname.match(/officialImages\[(.+)\]/)?.[1];
      const item = result.find(
        (x) => x._tempId === id || String(x._tempId) === id
      );
      if (item) {
        // Delete old image from Cloudinary if exists
        if (item.imageId) await deleteFromCloudinary(item.imageId);
        const img = await uploadSingle(file, item.name || "official");
        item.image = img.url;
        item.imageId = img.public_id;
      }
    }
  }

  // Delete removed officials and their Cloudinary images
  for (const [id, ex] of Object.entries(existingMap)) {
    if (!incomingIds.has(id)) {
      if (ex.imageId) await deleteFromCloudinary(ex.imageId);
      await GovOfficial.findByIdAndDelete(id);
    }
  }

  // Clear all and re-insert (simplest approach for full replacement)
  await GovOfficial.deleteMany({});
  const saved = await GovOfficial.insertMany(
    result.map(({ _tempId, ...data }) => data)
  );

  res.json(saved);
});
