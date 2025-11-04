import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";               // ✅ add this
import AdminRouter from "./routes/admin.js";

import { attachDbConnection } from "./middlewares/dbConnection.js";

dotenv.config();

const app = express();
const uri = process.env.MONGO_URL;

// --- MIDDLEWARE ---https://gpgomevadi.netlify.app/login
app.use(cors({                       // ✅ allow your frontend origin here
  origin: ["http://localhost:5173",
           "http://localhost:5174",
           "https://gpgomewadi.vercel.app",
           "https://www.gpgomevadi.in",
           "https://www.gpambewadi.in",
           "https://www.gpshelagi.in", 
           "https://www.gptagarkheda.in",
           "https://gptadawale.in"], // or your deployed frontend URL
  credentials: true,                 // if you send cookies/auth headers
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- DB CONNECTION ---
mongoose.connect(uri)
  .then(() => console.log("DB Connected"))
  .catch((err) => console.error("DB Connection Error:", err));

// --- ROUTES ---



app.get("/", (req, res) => res.send("Hello World!")); // changed to app.get




app.use("/api/admin", attachDbConnection, AdminRouter);

// --- ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.statusCode || 500).json({ error: err.message });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
