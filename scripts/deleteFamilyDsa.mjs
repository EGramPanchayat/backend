import mongoose from 'mongoose';

const MONGO_URL = 'mongodb+srv://sudesh:Atpadi%40123@egrampanchayat.bj4tvkm.mongodb.net/gpGomevadi?retryWrites=true&w=majority';

const FamilySchema = new mongoose.Schema({}, { strict: false });
const TaxBillSchema = new mongoose.Schema({}, { strict: false });
const PaymentSchema = new mongoose.Schema({}, { strict: false });
const ApplicationSchema = new mongoose.Schema({}, { strict: false });

await mongoose.connect(MONGO_URL);
console.log('Connected to MongoDB');

const Family = mongoose.model('families', FamilySchema, 'families');
const TaxBill = mongoose.model('taxbills', TaxBillSchema, 'taxbills');
const Payment = mongoose.model('paymenthistories', PaymentSchema, 'paymenthistories');
const Application = mongoose.model('dakhalamaqanis', ApplicationSchema, 'dakhalamaqanis');

// Step 1: Find the family
const family = await Family.findOne({ mainMemberName: { $regex: /dsa/i } }).lean();
if (!family) {
  console.log('Family not found!');
  process.exit(0);
}

console.log('Found family:', JSON.stringify({ _id: family._id, familyId: family.familyId, mainMemberName: family.mainMemberName }, null, 2));
const familyId = family.familyId;
const familyObjId = family._id;

// Step 2: Delete tax bills
const taxResult = await TaxBill.deleteMany({ familyId });
console.log(`Deleted ${taxResult.deletedCount} tax bill(s)`);

// Step 3: Delete payment history
const payResult = await Payment.deleteMany({ familyId });
console.log(`Deleted ${payResult.deletedCount} payment history record(s)`);

// Step 4: Delete user applications
const appResult = await Application.deleteMany({ familyId });
console.log(`Deleted ${appResult.deletedCount} user application(s)`);

// Step 5: Delete the family itself
await Family.deleteOne({ _id: familyObjId });
console.log(`Family "${family.mainMemberName}" (${familyId}) deleted successfully.`);

await mongoose.disconnect();
console.log('Done.');
