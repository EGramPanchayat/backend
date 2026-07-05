import crypto from "crypto";
import ExpressError from "../utils/ExpressError.js";
import wrapAsync from "../utils/wrapAsync.js";
import FamilySchema from "../DB/models/family.js";
import TaxBillSchema from "../DB/models/taxBill.js";

// Public lookup by Family ID and Token (for QR scanning)
export const lookupFamily = wrapAsync(async (req, res) => {
  const { familyId } = req.params;
  const { token } = req.query;

  if (!familyId || !token) {
    throw new ExpressError("Family ID and security token are required", 400);
  }

  const conn = req.dbConnection;
  const Family = conn.model("Family", FamilySchema);
  const TaxBill = conn.model("TaxBill", TaxBillSchema);

  // Validate token
  const family = await Family.findOne({ familyId, qrToken: token });
  if (!family) {
    throw new ExpressError("Unauthorized: invalid link or token", 403);
  }

  // Fetch outstanding taxes for this family
  const bills = await TaxBill.find({ familyId });

  res.json({
    success: true,
    family: {
      familyId: family.familyId,
      houseNumber: family.houseNumber,
      mainMemberName: family.mainMemberName,
      menCount: family.menCount,
      womenCount: family.womenCount,
      seniorCount: family.seniorCount,
      childrenCount: family.childrenCount,
    },
    bills,
  });
});

// Admin: Get all families
export const getFamilies = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const Family = conn.model("Family", FamilySchema);

  const list = await Family.find().sort({ createdAt: -1 });
  res.json(list);
});

// Admin: Create family (auto-generates qrToken)
export const createFamily = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const Family = conn.model("Family", FamilySchema);

  const {
    familyId,
    houseNumber,
    mainMemberName,
    mobileNumber,
    whatsappNumber,
    address,
    menCount,
    womenCount,
    seniorCount,
    childrenCount,
  } = req.body;

  if (!houseNumber || !mainMemberName || !mobileNumber || !address) {
    throw new ExpressError("Required fields missing", 450);
  }

  let finalFamilyId = familyId;
  if (!finalFamilyId) {
    const allFamilies = await Family.find();
    let maxNum = 0;
    allFamilies.forEach((f) => {
      if (f.familyId && f.familyId.startsWith("FM")) {
        const numPart = parseInt(f.familyId.replace("FM", ""), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });
    const nextNum = maxNum + 1;
    finalFamilyId = `FM${String(nextNum).padStart(4, "0")}`;
  }

  // Check unique familyId
  const existing = await Family.findOne({ familyId: finalFamilyId });
  if (existing) {
    throw new ExpressError(`Family ID ${finalFamilyId} already exists`, 400);
  }

  // Generate secure random QR Token
  const qrToken = crypto.randomBytes(16).toString("hex");

  const newFamily = new Family({
    familyId: finalFamilyId,
    houseNumber,
    mainMemberName,
    mobileNumber,
    whatsappNumber,
    address,
    menCount: Number(menCount || 0),
    womenCount: Number(womenCount || 0),
    seniorCount: Number(seniorCount || 0),
    childrenCount: Number(childrenCount || 0),
    qrToken,
  });

  await newFamily.save();
  res.json({ success: true, family: newFamily });
});

// Admin: Update family
export const updateFamily = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const conn = req.dbConnection;
  const Family = conn.model("Family", FamilySchema);

  const data = await Family.findByIdAndUpdate(id, req.body, { new: true });
  if (!data) throw new ExpressError("Family details not found", 404);

  res.json({ success: true, family: data });
});

// Admin: Delete family
export const deleteFamily = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const conn = req.dbConnection;
  const Family = conn.model("Family", FamilySchema);

  const result = await Family.findByIdAndDelete(id);
  if (!result) throw new ExpressError("Family not found", 404);

  res.json({ success: true, message: "Family deleted successfully" });
});
