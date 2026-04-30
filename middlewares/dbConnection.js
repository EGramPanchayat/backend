import mongoose from "mongoose";
import ExpressError from "../utils/ExpressError.js";
import wrapAsync from "../utils/wrapAsync.js";

const connections = {};


const ALLOWED_GP_NAMES = process.env.ALLOWED_GP_NAMES
  ? process.env.ALLOWED_GP_NAMES.split(",").map(n => n.trim()).filter(Boolean)
  : [];

export const attachDbConnection = wrapAsync(async (req, res, next) => {
  const gpName = req.headers["gp-name"];
  if (!gpName) {
    console.log(`[GP-NAME MISSING] ${req.method} ${req.originalUrl} | Origin: ${req.headers.origin || 'none'} | UA: ${req.headers['user-agent']?.slice(0, 60) || 'none'}`);
    throw new ExpressError("GP name header missing", 400);
  }

 
  if (!ALLOWED_GP_NAMES.includes(gpName)) {
    throw new ExpressError("Invalid GP name", 403);
  }

  if (!connections[gpName]) {
    const uri = process.env.MONGO_URL.replace("<GP_NAME>", gpName);

    console.log(`Connecting to DB: ${gpName}`);
    const conn = await mongoose.createConnection(uri).asPromise();

    connections[gpName] = conn;
    console.log(`Connected to DB: ${gpName}`);
  }

  req.dbConnection = connections[gpName];
  req.gpName = gpName;

  
  next();
});
