import ExpressError from "../utils/ExpressError.js";
import wrapAsync from "../utils/wrapAsync.js";
import UserApplicationSchema from "../DB/models/userApplication.js";
import { createNotification } from "./notification.controller.js";
import { uploadToCloudinary } from "../middlewares/cloudinaryUploadPDF.js";

// Villager: Submit application request
export const submitApplication = wrapAsync(async (req, res) => {
  const { applicantName, type, details } = req.body;
  const { familyId } = req.user;

  if (!applicantName || !type) {
    throw new ExpressError("Applicant name and request type are required", 400);
  }

  const conn = req.dbConnection;
  const UserApplication = conn.model("UserApplication", UserApplicationSchema);

  const application = new UserApplication({
    familyId,
    applicantName,
    type,
    details: details || {},
    status: "pending",
  });

  await application.save();

  // Create user notification
  await createNotification(conn, {
    familyId,
    type: "application_submitted",
    title: `नवीन अर्ज - ${type}`,
    message: `${applicantName} यांचा ${type} साठीचा अर्ज यशस्वीरीत्या सादर केला गेला आहे.`,
    metadata: { applicationId: application._id, type },
  });

  res.json({ success: true, application });
});

// Villager: Get own applications list
export const getUserApplications = wrapAsync(async (req, res) => {
  const { familyId } = req.user;
  const conn = req.dbConnection;
  const UserApplication = conn.model("UserApplication", UserApplicationSchema);

  const list = await UserApplication.find({ familyId }).sort({ createdAt: -1 });
  res.json({ success: true, applications: list });
});

// Admin: Get all applications list
export const getAdminApplications = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const UserApplication = conn.model("UserApplication", UserApplicationSchema);

  const list = await UserApplication.find().sort({ createdAt: -1 });
  res.json(list);
});

// Admin: Update application status and remark
export const updateApplicationStatus = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const { status, remark } = req.body;
  let documentUrl = req.body.documentUrl;

  const conn = req.dbConnection;
  const UserApplication = conn.model("UserApplication", UserApplicationSchema);

  const app = await UserApplication.findById(id);
  if (!app) throw new ExpressError("Application request not found", 404);

  if (req.file) {
    const uploadRes = await uploadToCloudinary(
      req.file.path,
      "village_certificates",
      `certificate_${id}`
    );
    documentUrl = uploadRes.url;
  }

  if (status !== undefined) {
    app.status = status;
    if (status === "completed") {
      app.completedAt = new Date();
    } else {
      app.completedAt = undefined;
    }
  }
  if (remark !== undefined) app.remark = remark;
  if (documentUrl !== undefined) app.documentUrl = documentUrl;

  await app.save();

  // Create user notification on status update
  const statusLabel = app.status === "completed" ? "पूर्ण झाली" : app.status === "need_documents" ? "कागदपत्रांची आवश्यकता" : "प्रलंबित";
  let message = `तुमच्या ${app.type} अर्जाची स्थिती '${statusLabel}' अशी अद्ययावत केली आहे.`;
  if (remark) {
    message += ` शेरा: ${remark}`;
  }
  await createNotification(conn, {
    familyId: app.familyId,
    type: "application_updated",
    title: `अर्ज अद्ययावत - ${app.type}`,
    message,
    metadata: { applicationId: app._id, status: app.status, remark },
  });

  res.json({ success: true, application: app });
});

// Villager: Update own application (if still pending)
export const updateUserApplication = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const { applicantName, details } = req.body;
  const { familyId } = req.user;

  const conn = req.dbConnection;
  const UserApplication = conn.model("UserApplication", UserApplicationSchema);

  const app = await UserApplication.findOne({ _id: id, familyId });
  if (!app) {
    throw new ExpressError("Application request not found", 404);
  }

  if (app.status !== "pending") {
    throw new ExpressError("Only pending applications can be edited", 400);
  }

  if (applicantName !== undefined) app.applicantName = applicantName;
  if (details !== undefined) app.details = { ...app.details, ...details };

  await app.save();

  res.json({ success: true, application: app });
});

