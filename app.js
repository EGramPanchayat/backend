import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";             
import AdminRouter from "./routes/admin.js";
import PublicRouter from "./routes/public.js";

import { attachDbConnection } from "./middlewares/dbConnection.js";

dotenv.config();

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


app.use("/api/admin", attachDbConnection, PublicRouter);
app.use("/api/admin", attachDbConnection, AdminRouter);

//Global ERROR HANDLER 
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    error: process.env.NODE_ENV === "production"
      ? "Something went wrong"
      : err.message
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
