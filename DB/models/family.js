import mongoose from "mongoose";

const familySchema = new mongoose.Schema({
  familyId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  houseNumber: {
    type: String,
    required: true,
  },
  mainMemberName: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
    required: true,
  },
  whatsappNumber: {
    type: String,
    default: "",
  },
  address: {
    type: String,
    required: true,
  },
  menCount: {
    type: Number,
    default: 0,
  },
  womenCount: {
    type: Number,
    default: 0,
  },
  seniorCount: {
    type: Number,
    default: 0,
  },
  childrenCount: {
    type: Number,
    default: 0,
  },
  qrToken: {
    type: String,
    required: true,
  },
}, { timestamps: true });

export default familySchema;
