import mongoose from "mongoose";

const taxScheduleSchema = new mongoose.Schema({
  isPaused: {
    type: Boolean,
    default: false
  },
  nextReleaseYear: {
    type: Number,
    default: 2025
  },
  history: [
    {
      year: Number,
      releasedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, { timestamps: true });

export default taxScheduleSchema;
