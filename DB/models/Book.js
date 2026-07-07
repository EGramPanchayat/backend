import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  author: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  coverImage: {
    type: String,
    default: "",
  },
  coverImageId: {
    type: String,
    default: "",
  },
  pdfFile: {
    type: String,
    default: "",
  },
  pdfFileId: {
    type: String,
    default: "",
  },
  downloads: {
    type: Number,
    default: 0,
  },
  isProtected: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default bookSchema;
