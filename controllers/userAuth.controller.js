import jwt from "jsonwebtoken";
import ExpressError from "../utils/ExpressError.js";
import wrapAsync from "../utils/wrapAsync.js";
import FamilySchema from "../DB/models/family.js";
import OtpCodeSchema from "../DB/models/otpCode.js";
import { sendOtpEmail } from "../utils/emailService.js";
import { getCookieOptions, getCookieClearOptions } from "../middlewares/authMiddleware.js";

// Request OTP
export const requestOtp = wrapAsync(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ExpressError("Email address is required", 400);
  }

  const emailLower = email.trim().toLowerCase();

  const conn = req.dbConnection;
  const Family = conn.model("Family", FamilySchema);
  const OtpCode = conn.model("OtpCode", OtpCodeSchema);

  // Check if email belongs to any family
  const family = await Family.findOne({ email: emailLower });
  if (!family) {
    throw new ExpressError("Email address is not registered under any household", 404);
  }

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

  // Upsert OTP
  await OtpCode.findOneAndDelete({ email: emailLower });
  const newOtp = new OtpCode({ email: emailLower, code, expiresAt });
  await newOtp.save();

  // Log to console for user/testing purposes
  console.log(`\n🔑 [OTP SERVICE] OTP for ${emailLower} is: ${code}\n`);

  // Send Email via Nodemailer
  try {
    await sendOtpEmail(emailLower, code);
  } catch (err) {
    console.error("Email Sending failed: ", err.message);
  }

  res.json({
    success: true,
    message: "OTP sent successfully",
    // In local sandbox development, return OTP in response for convenience
    otp: process.env.NODE_ENV !== "production" ? code : undefined,
  });
});

// Verify OTP & Login
export const verifyOtp = wrapAsync(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    throw new ExpressError("Email and OTP code are required", 400);
  }

  const emailLower = email.trim().toLowerCase();

  const conn = req.dbConnection;
  const Family = conn.model("Family", FamilySchema);
  const OtpCode = conn.model("OtpCode", OtpCodeSchema);

  // Check OTP
  const otpRecord = await OtpCode.findOne({ email: emailLower });
  if (!otpRecord || otpRecord.code !== code || otpRecord.expiresAt < new Date()) {
    throw new ExpressError("Invalid or expired OTP code", 401);
  }

  // Find family
  const family = await Family.findOne({ email: emailLower });
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
  const opts = getCookieOptions(req);
  res.cookie("userAccessToken", token, {
    ...opts,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  });

  res.json({
    success: true,
    message: "Login successful",
    token,
    family: {
      familyId: family.familyId,
      mainMemberName: family.mainMemberName,
      houseNumber: family.houseNumber,
    },
  });
});

// Check auth status
export const checkUserAuth = wrapAsync(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = req.cookies?.userAccessToken || (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);
  if (!token) return res.json({ ok: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const conn = req.dbConnection;
    if (conn) {
      const Family = conn.model("Family", FamilySchema);
      const family = await Family.findOne({ familyId: decoded.familyId });
      if (!family) {
        res.clearCookie("userAccessToken", getCookieClearOptions(req));
        return res.json({ ok: false });
      }
      return res.json({
        ok: true,
        family,
      });
    }
    return res.json({ ok: false });
  } catch {
    return res.json({ ok: false });
  }
});

// Logout
export const logoutUser = wrapAsync(async (req, res) => {
  res.clearCookie("userAccessToken", getCookieClearOptions(req));
  res.json({ success: true, message: "Logged out successfully" });
});

// Request OTP by QR (familyId + token lookup)
export const requestOtpByQr = wrapAsync(async (req, res) => {
  const { familyId, token } = req.body;
  if (!familyId || !token) {
    throw new ExpressError("Family ID and token are required", 400);
  }

  const conn = req.dbConnection;
  const Family = conn.model("Family", FamilySchema);
  const OtpCode = conn.model("OtpCode", OtpCodeSchema);

  // Validate token and family
  const family = await Family.findOne({ familyId, qrToken: token });
  if (!family) {
    throw new ExpressError("Unauthorized: invalid link or token", 403);
  }

  const email = family.email;
  if (!email) {
    throw new ExpressError("Registered email address not found for this household", 404);
  }

  const emailLower = email.trim().toLowerCase();

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

  // Upsert OTP
  await OtpCode.findOneAndDelete({ email: emailLower });
  const newOtp = new OtpCode({ email: emailLower, code, expiresAt });
  await newOtp.save();

  console.log(`\n🔑 [OTP SERVICE] QR OTP for family ${familyId} (${emailLower}) is: ${code}\n`);

  // Send Email via Nodemailer
  try {
    await sendOtpEmail(emailLower, code);
  } catch (err) {
    console.error("Email Sending failed: ", err.message);
  }

  // Return partially masked email for feedback
  const parts = emailLower.split("@");
  const namePart = parts[0];
  const domainPart = parts[1];
  const maskedName = namePart.length > 2 ? `${namePart.slice(0, 2)}***${namePart.slice(-1)}` : `${namePart}***`;
  const maskedEmail = `${maskedName}@${domainPart}`;

  res.json({
    success: true,
    message: `OTP sent successfully`,
    email: emailLower,
    maskedEmail,
    otp: process.env.NODE_ENV !== "production" ? code : undefined,
  });
});
