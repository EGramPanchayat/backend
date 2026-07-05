import mongoose from "mongoose";

const paymentHistorySchema = new mongoose.Schema({
  familyId: {
    type: String,
    required: true,
  },
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TaxBill",
    // Aggregated category payments can be distributed over several bills.
    required: false,
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
  allocations: [{
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaxBill",
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    taxType: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  }],
  notes: {
    type: String,
    default: "",
  },
}, { timestamps: true });

export default paymentHistorySchema;
