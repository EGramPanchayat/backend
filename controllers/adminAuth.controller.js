import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import ExpressError from "../utils/ExpressError.js";
import UserSchema from "../DB/models/userModel.js";
import wrapAsync from "../utils/wrapAsync.js";
import { getCookieOptions, getCookieClearOptions } from "../middlewares/authMiddleware.js";

// Generate Access Token
function signAccessToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
  );
}

//Generate Refresh Token
function signRefreshToken(user) {
  return jwt.sign(
    { id: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
  );
}

// set both cookies on the response and persist refresh token in DB
async function setAuthCookies(res, user, conn) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const opts = getCookieOptions();

  // Save refresh token in the user document
  const User = conn.model("User", UserSchema);
  await User.findByIdAndUpdate(user._id, { refreshToken });

  // Access token cookie — short-lived (15 minutes)
  res.cookie("accessToken", accessToken, {
    ...opts,
    maxAge: 1000 * 60 * 15, // 15 minutes
  });

  // Refresh token cookie — long-lived (7 days)
  res.cookie("refreshToken", refreshToken, {
    ...opts,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}

// ──────────────────────────────────────────────
// POST /api/admin/login
// Validates credentials, issues access + refresh tokens
// ──────────────────────────────────────────────
export const login = wrapAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ExpressError("Email and password are required", 400);
  }

  const conn = req.dbConnection;
  const User = conn.model("User", UserSchema);

  const user = await User.findOne({ email });
  if (!user) throw new ExpressError("Invalid email or password", 401);

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new ExpressError("Invalid email or password", 401);

  await setAuthCookies(res, user, conn);
  res.json({ success: true, message: "Login successful" });
});

// ──────────────────────────────────────────────
// POST /api/admin/refresh
// Uses the long-lived refresh token to issue a new access token.
// Called by the frontend when a 401 is received.
// ──────────────────────────────────────────────
export const refreshToken = wrapAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw new ExpressError("No refresh token — please log in", 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    // Refresh token expired or tampered — full re-login required
    res.clearCookie("accessToken", getCookieClearOptions());
    res.clearCookie("refreshToken", getCookieClearOptions());
    throw new ExpressError("Refresh token expired — please log in again", 401);
  }

  // Verify user still exists
  const conn = req.dbConnection;
  const User = conn.model("User", UserSchema);
  const user = await User.findById(decoded.id).select("-password");

  if (!user) {
    res.clearCookie("accessToken", getCookieClearOptions());
    res.clearCookie("refreshToken", getCookieClearOptions());
    throw new ExpressError("User no longer exists", 401);
  }

  // Verify the refresh token matches what's stored in the DB
  if (user.refreshToken !== token) {
    res.clearCookie("accessToken", getCookieClearOptions());
    res.clearCookie("refreshToken", getCookieClearOptions());
    throw new ExpressError("Refresh token revoked — please log in again", 401);
  }

  // Issue fresh access and rotated refresh tokens
  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);

  // Update in DB
  await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

  const opts = getCookieOptions();
  res.cookie("accessToken", newAccessToken, {
    ...opts,
    maxAge: 1000 * 60 * 15,
  });
  res.cookie("refreshToken", newRefreshToken, {
    ...opts,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  res.json({ success: true, message: "Token refreshed" });
});

// ──────────────────────────────────────────────
// GET /api/admin/check
// Verifies if the current access token is still valid.
// ──────────────────────────────────────────────
export const checkAuth = wrapAsync(async (req, res) => {
  const token = req.cookies?.accessToken;
  if (!token) return res.json({ ok: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const conn = req.dbConnection;
    if (conn) {
      const User = conn.model("User", UserSchema);
      const user = await User.findById(decoded.id).select("_id email");
      if (!user) {
        res.clearCookie("accessToken", getCookieClearOptions());
        return res.json({ ok: false });
      }
    }

    return res.json({ ok: true });
  } catch {
    // Access token expired — but refresh token may still be valid
    // Frontend should call /refresh, not re-login immediately
    return res.json({ ok: false });
  }
});

// ──────────────────────────────────────────────
// POST /api/admin/logout
// Clears BOTH cookies.
// ──────────────────────────────────────────────
export const logout = wrapAsync(async (req, res) => {
  // Clear refresh token from DB (if user is identified)
  const token = req.cookies?.accessToken || req.cookies?.refreshToken;
  if (token) {
    try {
      const secret = req.cookies?.accessToken
        ? process.env.JWT_SECRET
        : process.env.REFRESH_TOKEN_SECRET;
      const decoded = jwt.verify(token, secret);
      const conn = req.dbConnection;
      if (conn) {
        const User = conn.model("User", UserSchema);
        await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
      }
    } catch {
      // Token invalid/expired — still clear cookies below
    }
  }

  res.clearCookie("accessToken", getCookieClearOptions());
  res.clearCookie("refreshToken", getCookieClearOptions());

  res.json({ success: true, message: "Logged out successfully" });
});
