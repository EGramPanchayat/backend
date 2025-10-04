import bcrypt from "bcrypt";
import ExpressError from "../utils/ExpressError.js";
import UserSchema from "../DB/models/userModel.js"; // Mongoose schema only

// POST /api/admin/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const conn = req.dbConnection; // Dynamic GP-specific DB
    const User = conn.model("User", UserSchema); // attach model to this connection

    // Find user
    const user = await User.findOne({ email });
    if (!user) throw new ExpressError("Invalid email", 401);

    // Check password
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new ExpressError("Invalid password", 401);

    // Set httpOnly cookie
   res.cookie("adminAuth", user._id.toString(), {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 2,
    });


    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/check
export const checkAuth = async (req, res, next) => {
  try {
    const ok = Boolean(req.cookies.adminAuth);
  

    res.json({ ok });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/logout
export const logout = async (req, res, next) => {
  try {
    res.clearCookie("adminAuth");
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
