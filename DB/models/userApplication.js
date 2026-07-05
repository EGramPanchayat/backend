import mongoose from "mongoose";

const userApplicationSchema = new mongoose.Schema({
  familyId: {
    type: String,
    required: true,
  },
  applicantName: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  details: {
    type: Object,
    default: {},
  },
  status: {
    type: String,
    enum: ["pending", "completed", "need_documents"],
    default: "pending",
  },
  paymentStatus: {
    type: String,
    enum: ["not_required", "pending", "paid"],
    default: "not_required",
  },
  paymentAmount: {
    type: Number,
    default: 0,
  },
  paymentTransactionId: {
    type: String,
    default: "",
  },
  paymentOrderId: {
    type: String,
    default: "",
  },
  remark: {
    type: String,
    default: "",
  },
  documentUrl: {
    type: String,
    default: "",
  },
  completedAt: {
    type: Date,
  },
}, { timestamps: true });

export default userApplicationSchema;
