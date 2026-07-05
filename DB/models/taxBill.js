import mongoose from "mongoose";

const taxBillSchema = new mongoose.Schema({
  familyId: {
    type: String,
    required: true,
  },
  taxType: {
    type: String,
    required: true, // 'house', 'water', 'health', 'electricity', etc.
  },
  year: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["pending", "paid", "partial"],
    default: "pending",
  },
  dueDate: {
    type: Date,
  },
  reason: {
    type: String,
    default: "",
  },
}, { timestamps: true });

export default taxBillSchema;
