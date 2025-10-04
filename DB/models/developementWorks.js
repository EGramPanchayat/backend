import mongoose from 'mongoose';

const developementWorkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  // store both URL and public_id from Cloudinary
  image: {
    url: { type: String, required: true },
    publicId: { type: String, required: true }
  }
});

export default developementWorkSchema;
