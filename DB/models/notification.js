import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  familyId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      "tax_assigned",
      "tax_updated",
      "payment_received",
      "fine_assigned",
      "bulk_release",
      "auto_release",
    ],
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Index for efficient querying
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ familyId: 1, isRead: 1 });

export default notificationSchema;
