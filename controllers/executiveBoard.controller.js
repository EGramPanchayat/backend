// controllers/executiveBoardController.js
import wrapAsync from "../utils/wrapAsync.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../middlewares/cloudinaryUpload.js";
import ExpressError from "../utils/ExpressError.js";
import ExecutiveBoardSchema from "../DB/models/executiveBoard.js";

/** POST /exboard-karyakari-mandal */
export const upsertExecutiveBoard = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const ExecutiveBoard = conn.model("ExecutiveBoard", ExecutiveBoardSchema);

  const body = req.body;
  let board = await ExecutiveBoard.findOne();

  // --- Prepare sarpanch & upsarpanch ---
  const sarpanchData = body.sarpanch || {};
  const upsarpanchData = body.upsarpanch || {};

  const baseSarpanch = {
    _id: board?.sarpanch?._id,
    name: sarpanchData.name || board?.sarpanch?.name || "",
    mobile: sarpanchData.mobile || board?.sarpanch?.mobile || "",
    image: board?.sarpanch?.image,
    imageId: board?.sarpanch?.imageId,
  };

  const baseUpsarpanch = {
    _id: board?.upsarpanch?._id,
    name: upsarpanchData.name || board?.upsarpanch?.name || "",
    mobile: upsarpanchData.mobile || board?.upsarpanch?.mobile || "",
    image: board?.upsarpanch?.image,
    imageId: board?.upsarpanch?.imageId,
  };

  // ------------------ Handle Deletions ------------------
  if (board) {
    if (body.deletedMemberIds?.length) {
      for (const id of body.deletedMemberIds) {
        const m = board.members.id(id);
        if (m) {
          if (m.imageId) await deleteFromCloudinary(m.imageId);
          m.deleteOne();
        }
      }
    }
    if (body.deletedOfficerIds?.length) {
      for (const id of body.deletedOfficerIds) {
        const o = board.staff?.officers.id(id);
        if (o) {
          if (o.imageId) await deleteFromCloudinary(o.imageId);
          o.deleteOne();
        }
      }
    }
  }

  // ------------------ Handle Members ------------------
  const membersArr = body.members || [];
  const baseMembers = [];

  for (const m of membersArr) {
    let existing = m._id && board ? board.members.id(m._id) : null;

    if (existing) {
      existing.name = m.name;
      existing.mobile = m.mobile;
      baseMembers.push(existing);
    } else {
      baseMembers.push({
        _id: m._id || undefined,
        id: m.id || undefined,
        name: m.name,
        mobile: m.mobile,
      });
    }
  }

  // ------------------ Handle Officers ------------------
  const officersArr = body.staff || [];
  const baseOfficers = [];

  for (const o of officersArr) {
    let existing = o._id && board ? board.staff?.officers.id(o._id) : null;

    if (existing) {
      existing.role = o.role;
      existing.name = o.name;
      existing.mobile = o.mobile;
      baseOfficers.push(existing);
    } else {
      baseOfficers.push({
        _id: o._id || undefined,
        id: o.id || undefined,
        role: o.role,
        name: o.name,
        mobile: o.mobile,
      });
    }
  }

  // ------------------ Handle File Uploads ------------------
  const uploadSingle = (file, folder, name) =>
    uploadToCloudinary(file.path, `${req.gpName}/executiveBoard/${folder}`, name);

  for (const file of req.files || []) {
    const fname = file.fieldname;

    if (fname === "sarpanch") {
      if (baseSarpanch.imageId) await deleteFromCloudinary(baseSarpanch.imageId);
      const img = await uploadSingle(file, "sarpanch", baseSarpanch.name);
      Object.assign(baseSarpanch, { image: img.url, imageId: img.public_id });
    } else if (fname === "upsarpanch") {
      if (baseUpsarpanch.imageId) await deleteFromCloudinary(baseUpsarpanch.imageId);
      const img = await uploadSingle(file, "upsarpanch", baseUpsarpanch.name);
      Object.assign(baseUpsarpanch, { image: img.url, imageId: img.public_id });
    } else if (fname.startsWith("memberImages[")) {
      const id = fname.match(/memberImages\[(.+)\]/)?.[1];
      const m = baseMembers.find(x => String(x._id) === id || String(x.id) === id);
      if (m) {
        if (m.imageId) await deleteFromCloudinary(m.imageId);
        const img = await uploadSingle(file, "members", m.name || "member");
        Object.assign(m, { image: img.url, imageId: img.public_id });
      }
    } else if (fname.startsWith("officerImages[")) {
      const id = fname.match(/officerImages\[(.+)\]/)?.[1];
      const o = baseOfficers.find(x => String(x._id) === id || String(x.id) === id);
      if (o) {
        if (o.imageId) await deleteFromCloudinary(o.imageId);
        const img = await uploadSingle(file, "officers", o.role || "officer");
        Object.assign(o, { image: img.url, imageId: img.public_id });
      }
    }
  }

  // ------------------ Final Payload ------------------
  const payload = {
    sarpanch: baseSarpanch,
    upsarpanch: baseUpsarpanch,
    members: baseMembers,
    staff: { officers: baseOfficers },
  };

  // ------------------ Save / Update ------------------
  board = board
    ? await ExecutiveBoard.findByIdAndUpdate(board._id, payload, {
        new: true,
        runValidators: true,
      })
    : await ExecutiveBoard.create(payload);

  res.json(board);
});


/** GET /exboard-karyakari-mandal */
export const getExecutiveBoard = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const ExecutiveBoard = conn.model("ExecutiveBoard", ExecutiveBoardSchema);

  const board = await ExecutiveBoard.findOne();
  if (!board) return res.status(404).json({ message: "No Executive Board data found" });
  res.json(board);
});


/** DELETE /exboard-karyakari-mandal/member/:id */

