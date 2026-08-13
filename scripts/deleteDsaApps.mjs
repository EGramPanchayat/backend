import mongoose from 'mongoose';

const MONGO_URL = 'mongodb+srv://sudesh:Atpadi%40123@egrampanchayat.bj4tvkm.mongodb.net/gpGomevadi?retryWrites=true&w=majority';

const ApplicationSchema = new mongoose.Schema({}, { strict: false });

await mongoose.connect(MONGO_URL);
console.log('Connected to MongoDB');

const UserApplication = mongoose.model('userapplications', ApplicationSchema, 'userapplications');

// Delete applications matching familyId FM0011 or applicantName dsa
const appResult = await UserApplication.deleteMany({
  $or: [
    { familyId: "FM0011" },
    { applicantName: { $regex: /dsa/i } }
  ]
});

console.log(`Deleted ${appResult.deletedCount} user application(s) for dsa/FM0011.`);

await mongoose.disconnect();
console.log('Done.');
