import jwt from "jsonwebtoken";
import ExpressError from "../utils/ExpressError.js";
import wrapAsync from "../utils/wrapAsync.js";
import FamilySchema from "../DB/models/family.js";
import OtpCodeSchema from "../DB/models/otpCode.js";
import { getCookieOptions, getCookieClearOptions } from "../middlewares/authMiddleware.js";

// Request OTP
export const requestOtp = wrapAsync(async (req, res) => {
  const { mobileNumber } = req.body;
  if (!mobileNumber) {
    throw new ExpressError("Mobile number is required", 400);
  }

  const conn = req.dbConnection;
  const Family = conn.model("Family", FamilySchema);
  const OtpCode = conn.model("OtpCode", OtpCodeSchema);

  // Check if mobile number belongs to any family
  const family = await Family.findOne({ mobileNumber });
  if (!family) {
    throw new ExpressError("Mobile number is not registered under any household", 404);
  }

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

  // Upsert OTP
  await OtpCode.findOneAndDelete({ mobileNumber });
  const newOtp = new OtpCode({ mobileNumber, code, expiresAt });
  await newOtp.save();

  // Log to console for user/testing purposes
  console.log(`\n🔑 [OTP SERVICE] OTP for ${mobileNumber} is: ${code}\n`);

  res.json({
    success: true,
    message: "OTP sent successfully",
    // In local sandbox development, return OTP in response for convenience
    otp: process.env.NODE_ENV !== "production" ? code : undefined,
  });
});

// Verify OTP & Login
export const verifyOtp = wrapAsync(async (req, res) => {
  const { mobileNumber, code } = req.body;
  if (!mobileNumber || !code) {
    throw new ExpressError("Mobile number and OTP code are required", 400);
  }

  const conn = req.dbConnection;
  const Family = conn.model("Family", FamilySchema);
  const OtpCode = conn.model("OtpCode", OtpCodeSchema);

  // Check OTP
  const otpRecord = await OtpCode.findOne({ mobileNumber });
  if (!otpRecord || otpRecord.code !== code || otpRecord.expiresAt < new Date()) {
    throw new ExpressError("Invalid or expired OTP code", 401);
  }

  // Find family
  const family = await Family.findOne({ mobileNumber });
  if (!family) {
    throw new ExpressError("Household details not found", 404);
  }

  // Delete OTP code
  await OtpCode.deleteOne({ _id: otpRecord._id });

  // Generate JWT Token
  const token = jwt.sign(
    { familyId: family.familyId, id: family._id, role: "villager" },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  // Set Cookie
  const opts = getCookieOptions();
  res.cookie("userAccessToken", token, {
    ...opts,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  });

  res.json({
    success: true,
    message: "Login successful",
    family: {
      familyId: family.familyId,
      mainMemberName: family.mainMemberName,
      houseNumber: family.houseNumber,
    },
  });
});

// Check auth status
export const checkUserAuth = wrapAsync(async (req, res) => {
  const token = req.cookies?.userAccessToken;
  if (!token) return res.json({ ok: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const conn = req.dbConnection;
    if (conn) {
      const Family = conn.model("Family", FamilySchema);
      const family = await Family.findOne({ familyId: decoded.familyId }).select("_id familyId mainMemberName houseNumber");
      if (!family) {
        res.clearCookie("userAccessToken", getCookieClearOptions());
        return res.json({ ok: false });
      }
      return res.json({
        ok: true,
        family: {
          familyId: family.familyId,
          mainMemberName: family.mainMemberName,
          houseNumber: family.houseNumber,
        },
      });
    }
    return res.json({ ok: false });
  } catch {
    return res.json({ ok: false });
  }
});

// Logout
export const logoutUser = wrapAsync(async (req, res) => {
  res.clearCookie("userAccessToken", getCookieClearOptions());
  res.json({ success: true, message: "Logged out successfully" });
});
