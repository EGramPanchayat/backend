import mongoose from "mongoose";

const GovernmentOfficialSchema = new mongoose.Schema({
  name: { type: String, required: true },       // e.g. "श्री. देवेंद्र फडणवीस"
  role: { type: String, required: true },       // e.g. "माननीय मुख्यमंत्री"
  image: { type: String, default: "/images/profile.png" },
  imageId: { type: String, default: "" },       // Cloudinary public_id
  order: { type: Number, default: 0 },          // Display order
}, { timestamps: true });

export default GovernmentOfficialSchema;
