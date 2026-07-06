import mongoose from "mongoose";
import crypto from "crypto";
import dotenv from "dotenv";

import FamilySchema from "./DB/models/family.js";
import TaxBillSchema from "./DB/models/taxBill.js";
import UserApplicationSchema from "./DB/models/userApplication.js";

dotenv.config();

const dbUri = "mongodb+srv://sudesh:Atpadi%40123@egrampanchayat.bj4tvkm.mongodb.net/gpGomevadi?retryWrites=true&w=majority";

async function run() {
  console.log("Connecting to Database: gpGomevadi...");
  const conn = await mongoose.createConnection(dbUri).asPromise();
  console.log("Connected successfully!");

  const Family = conn.model("Family", FamilySchema);
  const TaxBill = conn.model("TaxBill", TaxBillSchema);
  const UserApplication = conn.model("UserApplication", UserApplicationSchema);

  // Clean old VMS data
  console.log("Cleaning old VMS tables...");
  await Family.deleteMany({});
  await TaxBill.deleteMany({});
  await UserApplication.deleteMany({});

  console.log("Seeding Families...");
  const f1 = new Family({
    familyId: "FM0001",
    houseNumber: "H-101",
    mainMemberName: "गणेश तानाजी सुतार",
    email: "ganesh@gmail.com",
    whatsappNumber: "9876543210",
    address: "गोमेवाडी गल्ली क्र. १",
    menCount: 2,
    womenCount: 2,
    seniorCount: 1,
    childrenCount: 1,
    qrToken: crypto.randomBytes(16).toString("hex"),
  });

  const f2 = new Family({
    familyId: "FM0002",
    houseNumber: "H-102",
    mainMemberName: "सुनील बबन शिंदे",
    email: "sunil@gmail.com",
    whatsappNumber: "9999999999",
    address: "गोमेवाडी गल्ली क्र. ३",
    menCount: 3,
    womenCount: 2,
    seniorCount: 0,
    childrenCount: 2,
    qrToken: crypto.randomBytes(16).toString("hex"),
  });

  await f1.save();
  await f2.save();
  console.log("Families Seeded Successfully!");

  console.log("Seeding Tax Bills...");
  const bills = [
    new TaxBill({
      familyId: "FM0001",
      taxType: "house",
      year: 2026,
      amount: 1500,
      paidAmount: 500,
      status: "partial",
      dueDate: new Date("2026-12-31"),
    }),
    new TaxBill({
      familyId: "FM0001",
      taxType: "water",
      year: 2026,
      amount: 600,
      paidAmount: 0,
      status: "pending",
      dueDate: new Date("2026-12-31"),
    }),
    new TaxBill({
      familyId: "FM0002",
      taxType: "house",
      year: 2026,
      amount: 1200,
      paidAmount: 1200,
      status: "paid",
      dueDate: new Date("2026-12-31"),
    }),
    new TaxBill({
      familyId: "FM0002",
      taxType: "health",
      year: 2026,
      amount: 300,
      paidAmount: 0,
      status: "pending",
      dueDate: new Date("2026-12-31"),
    }),
  ];

  for (const b of bills) {
    await b.save();
  }
  console.log("Tax Bills Seeded Successfully!");

  console.log("Seeding User Applications...");
  const apps = [
    new UserApplication({
      familyId: "FM0001",
      applicantName: "सुशांत गणेश सुतार",
      type: "birth",
      details: { description: "नवीन जन्म दाखला मिळणेबाबत अर्ज." },
      status: "pending",
    }),
    new UserApplication({
      familyId: "FM0001",
      applicantName: "गणेश तानाजी सुतार",
      type: "income",
      details: { description: "शैक्षणिक कारणासाठी उत्पन्न दाखला." },
      status: "need_documents",
      remark: "कृपया मागील वर्षाचा रहिवासी दाखला जोडा.",
    }),
  ];

  for (const a of apps) {
    await a.save();
  }
  console.log("User Applications Seeded Successfully!");

  await conn.close();
  console.log("Seeder script execution complete!");
}

run().catch(console.error);
