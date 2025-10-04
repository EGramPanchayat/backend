import e from "express";
import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "News text is required"],
      trim: true,
      maxlength: 500, // optional limit
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

export default newsSchema;
