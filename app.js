import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";             
import AdminRouter from "./routes/admin.js";
import PublicRouter from "./routes/public.js";

import { attachDbConnection } from "./middlewares/dbConnection.js";

const app = express();


const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean)
  : [];



app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));



app.use(express.json());
app.use(cookieParser());




app.get("/", (req, res) => res.send("GP MANAGEMENT SYSTEM!")); 

// Public routes — no auth required
app.use("/api", attachDbConnection, PublicRouter);

// Admin routes — auth required (requireAuth is inside AdminRouter)
app.use("/api/admin", attachDbConnection, AdminRouter);

//Global ERROR HANDLER 
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isServerError = statusCode >= 500;

  // Only hide internal server errors in production
  // Client errors (4xx) like wrong password, invalid email etc. always show real message
  if (isServerError) console.error(err);

  res.status(statusCode).json({
    error: (isServerError && process.env.NODE_ENV === "production")
      ? "Something went wrong"
      : err.message
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
