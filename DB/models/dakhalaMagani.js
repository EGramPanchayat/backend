
import mongoose from 'mongoose';

const dakhalaSchema = new mongoose.Schema({
  forName: { type: String, required: true, trim: true },
  whatsappNo: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true },
  dob: { type: String, trim: true },
  childName: { type: String, trim: true },
  deathName: { type: String, trim: true },
  deathDate: { type: String, trim: true },
  coupleName: { type: String, trim: true },
  marriageYear: { type: String, trim: true },
  propertyNo: { type: String, trim: true },
  certificateName: { type: String, trim: true },
  niradharName: { type: String, trim: true },
  paymentImg: {
    url: { type: String },
    publicId: { type: String },
  },
}, {
  timestamps: true
});

dakhalaSchema.index({ createdAt: 1 }, { expireAfterSeconds: 80 * 24 * 60 * 60 });

export default dakhalaSchema;
