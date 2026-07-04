import mongoose from "mongoose";

const otpCodeSchema = new mongoose.Schema({
  mobileNumber: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default otpCodeSchema;
