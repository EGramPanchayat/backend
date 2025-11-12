import mongoose from "mongoose";

const paripatrakSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      trim: true,
    },
    pdfUrl: {
      type: String, // optional PDF link from Cloudinary
    },
    publicId: {
      type: String, // optional Cloudinary ID (for delete/update)
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Paripatrak", paripatrakSchema);
