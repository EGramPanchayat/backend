import mongoose from "mongoose";

const qrSchema = new mongoose.Schema(
  {
    panipattiQR: {
      url: { type: String },
      public_id: { type: String },
    },
    gharPattiQR: {
      url: { type: String },
      public_id: { type: String },
    },
  },
  { timestamps: true }
);


export default qrSchema;
