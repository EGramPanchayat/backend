import jwt from "jsonwebtoken";
import ExpressError from "../utils/ExpressError.js";
import UserSchema from "../DB/models/userModel.js";
import wrapAsync from "../utils/wrapAsync.js";


export function getCookieClearOptions(req) {
  const origin = req?.get("origin") || "";
  const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
  const isProduction = process.env.NODE_ENV === "production" && !isLocalhost;
  return {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    path: "/",
  };
}


export const requireAuth = wrapAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = req.cookies?.accessToken || (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

  if (!token) {
    throw new ExpressError("Authentication required — please log in", 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (jwtErr) {
    res.clearCookie("accessToken", getCookieClearOptions(req));
    if (jwtErr.name === "TokenExpiredError") {
      throw new ExpressError("Access token expired", 401);
    }
    throw new ExpressError("Invalid token — please log in again", 401);
  }

  const conn = req.dbConnection;
  if (!conn) {
    throw new ExpressError("Database connection not available", 500);
  }

  const User = conn.model("User", UserSchema);
  const user = await User.findById(decoded.id).select("-password");

  if (!user) {
    res.clearCookie("accessToken", getCookieClearOptions(req));
    throw new ExpressError("User no longer exists", 401);
  }

  req.user = user;
  next();
  
});

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ExpressError("Authentication required", 401));
    }
    if (req.user.role && !roles.includes(req.user.role)) {
      return next(new ExpressError("Forbidden — insufficient permissions", 403));
    }
    next();
  };
};

// Shared cookie options
export function getCookieOptions(req) {
  const origin = req?.get("origin") || "";
  const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
  const isProduction = process.env.NODE_ENV === "production" && !isLocalhost;
  return {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    path: "/",
  };
}

export const requireUserAuth = wrapAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = req.cookies?.userAccessToken || (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

  if (!token) {
    throw new ExpressError("Authentication required — please log in with your mobile", 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (jwtErr) {
    res.clearCookie("userAccessToken", getCookieClearOptions(req));
    if (jwtErr.name === "TokenExpiredError") {
      throw new ExpressError("Access token expired", 401);
    }
    throw new ExpressError("Invalid token — please log in again", 401);
  }

  const conn = req.dbConnection;
  if (!conn) {
    throw new ExpressError("Database connection not available", 500);
  }

  const FamilySchema = (await import("../DB/models/family.js")).default;
  const Family = conn.model("Family", FamilySchema);
  const family = await Family.findOne({ familyId: decoded.familyId });

  if (!family) {
    res.clearCookie("userAccessToken", getCookieClearOptions(req));
    throw new ExpressError("Household no longer exists", 401);
  }

  req.user = {
    _id: family._id,
    familyId: family.familyId,
    mobileNumber: family.mobileNumber,
    mainMemberName: family.mainMemberName,
    role: "villager"
  };
  
  next();
});

export const requireAdminOrUserAuth = wrapAsync(async (req, res, next) => {
  const userToken = req.cookies?.userAccessToken || (req.headers.authorization && req.headers.authorization.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : null);
  const adminToken = req.cookies?.accessToken;

  let decoded;
  if (userToken) {
    try {
      decoded = jwt.verify(userToken, process.env.JWT_SECRET);
      req.user = { familyId: decoded.familyId, role: "villager" };
      return next();
    } catch (e) {
      // fallback
    }
  }

  if (adminToken) {
    try {
      decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
      req.user = { id: decoded.id, email: decoded.email, role: "admin" };
      return next();
    } catch (e) {
      // fallback
    }
  }

  throw new ExpressError("Authentication required — please log in", 401);
});


