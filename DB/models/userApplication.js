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
    enum: ["birth", "death", "income", "marriage", "residence"],
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
  remark: {
    type: String,
    default: "",
  },
  documentUrl: {
    type: String,
    default: "",
  },
}, { timestamps: true });

export default userApplicationSchema;
