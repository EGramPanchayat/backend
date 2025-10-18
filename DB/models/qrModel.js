import mongoose from "mongoose";

const qrSchema = new mongoose.Schema(
  {
    panipattiQR: {
      url: { type: String },
      publicId: { type: String },
    },
    gharPattiQR: {
      url: { type: String },
      publicId: { type: String },
    },
    paymentQR: {
      url: { type: String },
      publicId: { type: String },
    },
  },
  { timestamps: true }
);


export default qrSchema;
