import ExpressError from "../utils/ExpressError.js";
import wrapAsync from "../utils/wrapAsync.js";
import UserApplicationSchema from "../DB/models/userApplication.js";

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
  res.json({ success: true, application });
});

// Villager: Get own applications list
export const getUserApplications = wrapAsync(async (req, res) => {
  const { familyId } = req.user;
  const conn = req.dbConnection;
  const UserApplication = conn.model("UserApplication", UserApplicationSchema);

  const list = await UserApplication.find({ familyId }).sort({ createdAt: -1 });
  res.json(list);
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
  const { status, remark, documentUrl } = req.body;

  const conn = req.dbConnection;
  const UserApplication = conn.model("UserApplication", UserApplicationSchema);

  const app = await UserApplication.findById(id);
  if (!app) throw new ExpressError("Application request not found", 404);

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
  res.json({ success: true, application: app });
});
