// middlewares/dbConnection.js
import mongoose from "mongoose";
import ExpressError from "../utils/ExpressError.js";

const connections = {};

export const attachDbConnection = async (req, res, next) => {
  try {
    const gpName = req.headers["x-gp-name"];
    if (!gpName) return next(new ExpressError("GP name header missing", 400));

    if (!connections[gpName]) {
      if (!process.env.MONGO_URL.includes("<GP_NAME>")) {
        return next(new ExpressError("MONGO_URL must include <GP_NAME>", 500));
      }

      const uri = process.env.MONGO_URL.replace("<GP_NAME>", gpName);

      console.log(`🔌 Connecting to DB: ${gpName}`);
      const conn = await mongoose.createConnection(uri).asPromise();

      connections[gpName] = conn;
      console.log(`✅ Connected to DB: ${gpName}`);
    }

    req.dbConnection = connections[gpName];
    req.gpName = gpName;
    next();
  } catch (err) {
    console.error("DB connection error:", err.message);
    next(err);
  }
};
