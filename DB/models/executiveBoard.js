// DB/models/executiveBoard.js
import mongoose from "mongoose";

const DEFAULT_IMG = "/images/profile.png";

const Person = new mongoose.Schema({
  _id: { type: String }, // ✅ explicitly allow UUIDs
  name: { type: String, required: true },
  mobile: String,
  image: { type: String, default: DEFAULT_IMG },
  imageId: String
});

const Officer = new mongoose.Schema({
  _id: { type: String }, // ✅ explicitly allow UUIDs
  role: { type: String, required: true },
  name: { type: String, required: true },
  mobile: String,
  image: { type: String, default: DEFAULT_IMG },
  imageId: String
});

const Staff = new mongoose.Schema({
  officers: { type: [Officer], default: [] }
}, { _id: false });

const ExecutiveBoardSchema = new mongoose.Schema({
  sarpanch: { type: Person, required: true },
  upsarpanch: { type: Person, required: true },
  members: { type: [Person], required: true },
  staff: { type: Staff, default: {} }
});

export default ExecutiveBoardSchema;
