import mongoose from "mongoose";

const paymentHistorySchema = new mongoose.Schema({
  familyId: {
    type: String,
    required: true,
  },
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TaxBill",
    required: true,
  },
  taxType: {
    type: String,
    required: true,
  },
  amountPaid: {
    type: Number,
    required: true,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  transactionId: {
    type: String,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["razorpay", "offline"],
    default: "razorpay",
  },
  status: {
    type: String,
    enum: ["success", "failed"],
    default: "success",
  },
}, { timestamps: true });

export default paymentHistorySchema;
