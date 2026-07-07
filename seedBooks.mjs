/**
 * seedBooks.mjs  —  One-time bulk book uploader
 * Usage: node seedBooks.mjs
 *
 * Reads each book folder from BOOKS_DIR, uploads cover + PDF to
 * Cloudflare R2, then inserts a MongoDB record with Marathi
 * title/author and isProtected=true.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const BOOKS_DIR = "C:\\Users\\sudes\\Downloads\\BOOKS";
const SKIP_FOLDERS = ["CoverPages"];

// ─── R2 CLIENT ───────────────────────────────────────────────────────────────
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL.replace(/\/$/, "");

const MIME = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function uploadToR2(filePath, folder) {
  const ext = path.extname(filePath).toLowerCase();
  const key = `${folder}/${uuidv4()}${ext}`;
  const body = fs.readFileSync(filePath);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: MIME[ext] || "application/octet-stream",
  }));
  return { url: `${PUBLIC_URL}/${key}`, key };
}

// ─── BOOK SCHEMA ─────────────────────────────────────────────────────────────
const bookSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  author:       { type: String, required: true, trim: true },
  category:     { type: String, required: true, trim: true },
  coverImage:   { type: String, default: "" },
  coverImageId: { type: String, default: "" },
  pdfFile:      { type: String, default: "" },
  pdfFileId:    { type: String, default: "" },
  downloads:    { type: Number, default: 0 },
  isProtected:  { type: Boolean, default: false },
  createdAt:    { type: Date, default: Date.now },
});

// ─── MARATHI LOOKUP TABLE ────────────────────────────────────────────────────
// Key = folder name (exact), Value = { title (Marathi), author (Marathi), category }
const BOOK_DATA = {
  "Aathwani Doordarshanchya -_Anant Pavaskar_Music Memoir": {
    title: "आठवणी दूरदर्शनच्या",
    author: "अनंत पावसकर",
    category: "Music",
  },
  "Aathwani Radiochya -_Anant Pavaskar_Music Memoir": {
    title: "आठवणी रेडिओच्या",
    author: "अनंत पावसकर",
    category: "Music",
  },
  "Abhivyakti Abhijeet Tongaonkar_Abhijeet Tongaonkar_Personal Essays": {
    title: "अभिव्यक्ती",
    author: "अभिजीत टोंगाओंकर",
    category: "Personal Essays",
  },
  "Agnipankh-Book-Marathi-Pdf_A.P.J. Abdul Kalam_Autobiography": {
    title: "अग्निपंख",
    author: "ए.पी.जे. अब्दुल कलाम",
    category: "Autobiography",
  },
  "Agri Articles 1 Ashok Kothare_Ashok Kothare_Agriculture": {
    title: "कृषी लेख - भाग १",
    author: "अशोक कोठारे",
    category: "Agriculture",
  },
  "Agri Articles 2 Ashok Kothare_Ashok Kothare_Agriculture": {
    title: "कृषी लेख - भाग २",
    author: "अशोक कोठारे",
    category: "Agriculture",
  },
  "Agri Articles 3 Ashok Kothare_Ashok Kothare_Agriculture": {
    title: "कृषी लेख - भाग ३",
    author: "अशोक कोठारे",
    category: "Agriculture",
  },
  "Agriculture Ashok Kothare 1 2_Ashok Kothare_Agriculture": {
    title: "शेती मार्गदर्शन - भाग १ व २",
    author: "अशोक कोठारे",
    category: "Agriculture",
  },
  "Agriculture Ashok Kothare 3 4_Ashok Kothare_Agriculture": {
    title: "शेती मार्गदर्शन - भाग ३ व ४",
    author: "अशोक कोठारे",
    category: "Agriculture",
  },
  "Agriculture Ashok Kothare 5 6_Ashok Kothare_Agriculture": {
    title: "शेती मार्गदर्शन - भाग ५ व ६",
    author: "अशोक कोठारे",
    category: "Agriculture",
  },
  "Agrulture Ashok Kothare 13To17_Ashok Kothare_Agriculture": {
    title: "शेती मार्गदर्शन - भाग १३ ते १७",
    author: "अशोक कोठारे",
    category: "Agriculture",
  },
  "Agrulture Ashok Kothare 7To12_Ashok Kothare_Agriculture": {
    title: "शेती मार्गदर्शन - भाग ७ ते १२",
    author: "अशोक कोठारे",
    category: "Agriculture",
  },
  "Alaukik - Lata Didi_Anant Pavaskar_Music Biography": {
    title: "अलौकिक - लता दीदी",
    author: "अनंत पावसकर",
    category: "Music",
  },
  "Anand Madhu Shirgaonkar_Madhu Shirgaonkar_Short Story Fiction": {
    title: "आनंद",
    author: "मधू शिरगांवकर",
    category: "Short Stories",
  },
  "Aranyagooj Ps Hirurkar L_P.S. Hirurkar_Travel Nature Essays": {
    title: "अरण्यगूज",
    author: "पी.एस. हिरुरकर",
    category: "Travel",
  },
  "Astaaii Keshavrav Bhole_Keshavrao Bhole_Music Autobiography": {
    title: "अस्ताई",
    author: "केशवराव भोले",
    category: "Music",
  },
  "Athavani Hindola Uday Phatak E_Uday Phatak_Personal Essays Memoir": {
    title: "आठवणींचा हिंदोळा",
    author: "उदय फाटक",
    category: "Personal Essays",
  },
  "Baba Ani Mi Pramod Suryawanshi_Pramod Suryawanshi_Personal Essays Memoir": {
    title: "बाबा आणि मी",
    author: "प्रमोद सूर्यवंशी",
    category: "Personal Essays",
  },
  "Chaaraa Peek Sachin Raut_Sachin Raut_Agriculture": {
    title: "चारा पीक",
    author: "सचिन राऊत",
    category: "Agriculture",
  },
  "Chandanyacha Paus Yashawant Kadam_Yashawant Kadam_Short Story Collection": {
    title: "चांदण्याचा पाऊस",
    author: "यशवंत कदम",
    category: "Short Stories",
  },
  "Chatani Sujata Rajeshri_Sujata Rajeshri_Culinary": {
    title: "चटणी",
    author: "सुजाता राजेश्री",
    category: "Culinary",
  },
  "Firastya Anil Solunke_Anil Solunke_Travel": {
    title: "फिरस्त्या",
    author: "अनिल सोलुंके",
    category: "Travel",
  },
  "Flavourfusion Supriya Upadhye_Supriya Upadhye_Culinary": {
    title: "फ्लेवर फ्युजन",
    author: "सुप्रिया उपाध्ये",
    category: "Culinary",
  },
  "Gandh Suvarna Lele_Suvarna Lele_Short Story Collection": {
    title: "गंध",
    author: "सुवर्णा लेले",
    category: "Short Stories",
  },
  "Hasyarangirangale Shyam Kulkarni_Shyam Kulkarni_Short Story Humor": {
    title: "हास्यरंगीरंगाळे",
    author: "श्याम कुलकर्णी",
    category: "Short Stories",
  },
  "Hemant Kumar_Anant Pavaskar_Music Biography": {
    title: "हेमंत कुमार",
    author: "अनंत पावसकर",
    category: "Music",
  },
  "Hirana Arun Kulakarni_Arun Kulkarni_Short Story Collection": {
    title: "हिरण",
    author: "अरुण कुलकर्णी",
    category: "Short Stories",
  },
  "Jameenms Kharedi Satish Joshi Esahity_Satish Joshi_Agriculture Practical Guide": {
    title: "जमीन खरेदी",
    author: "सतीश जोशी",
    category: "Agriculture",
  },
  "Jhashirani Lakshmibai Ashok Bendkhale E_Ashok Bendkhale_History Biography": {
    title: "झाशीची राणी लक्ष्मीबाई",
    author: "अशोक बेंडखळे",
    category: "History",
  },
  "Kalatani Smita Damle_Smita Damle_History": {
    title: "काळातणी",
    author: "स्मिता दामले",
    category: "History",
  },
  "Keral Shailesh Purohit_Shailesh Purohit_Travel": {
    title: "केरळ",
    author: "शैलेश पुरोहित",
    category: "Travel",
  },
  "Khaoo Anande Sujata Rajeshri_Sujata Rajeshri_Culinary": {
    title: "खाऊ आनंदे",
    author: "सुजाता राजेश्री",
    category: "Culinary",
  },
  "Khau Aanande_Rajeshri_Shimpi_and_Sujata_pawar_Culinary": {
    title: "खाऊ आनंदे",
    author: "राजेश्री शिंपी व सुजाता पवार",
    category: "Culinary",
  },
  "Khidkee Suvarna Lele_Suvarna Lele_Short Story": {
    title: "खिडकी",
    author: "सुवर्णा लेले",
    category: "Short Stories",
  },
  "Krushi Arthshastra Shubham Surawade_Shubham Surawade_Agriculture Economics": {
    title: "कृषी अर्थशास्त्र",
    author: "शुभम सुरवाडे",
    category: "Agriculture",
  },
  "Liechstenstain Omkar Zanje_Omkar Zanje_Travel": {
    title: "लिश्टेनस्टाईन",
    author: "ओंकार झांजे",
    category: "Travel",
  },
  "Lockdown Baban Dhanawade_Baban Dhanawade_Short Stories": {
    title: "लॉकडाऊन",
    author: "बाबन धनवडे",
    category: "Short Stories",
  },
  "Maharani Yesubai Ashok Bendkhale E_Ashok Bendkhale_History Biography": {
    title: "महाराणी येसूबाई",
    author: "अशोक बेंडखळे",
    category: "History",
  },
  "Mantarlelya Athavani Shriram Kale_Shriram Kale_Short Story Collection": {
    title: "मंतरलेल्या आठवणी",
    author: "श्रीराम काळे",
    category: "Short Stories",
  },
  "Mohd Rafi Anant Pavaskar_Anant Pavaskar_Music Biography": {
    title: "मोहंमद रफी",
    author: "अनंत पावसकर",
    category: "Music",
  },
  "Mrutyunjay Marathi_Shivaji Sawant_Mythological Historical Fiction": {
    title: "मृत्युंजय",
    author: "शिवाजी सावंत",
    category: "Mythology",
  },
  "Nishchyacha Mahameru Mahesh Gupte_Mahesh Gupte_History Biography": {
    title: "निश्चयाचा महामेरू",
    author: "महेश गुप्ते",
    category: "History",
  },
  "Raigadchijeevankatha_Unknown_History Travel": {
    title: "रायगडची जीवनकथा",
    author: "अज्ञात",
    category: "History",
  },
  "Rujuvaat Shriram Kale_Shriram Kale_Short Story Collection": {
    title: "रुजुवात",
    author: "श्रीराम काळे",
    category: "Short Stories",
  },
  "Sendriya Khat Udyog Ashok Kothare_Ashok Kothare_Agriculture": {
    title: "सेंद्रिय खत उद्योग",
    author: "अशोक कोठारे",
    category: "Agriculture",
  },
  "Shabdroop Amb Vrushali Hanmante_Vrushali Hanmante_Short Story Collection": {
    title: "शब्दरूप",
    author: "वृषाली हनमंते",
    category: "Short Stories",
  },
  "Sharirik Shikshan Shriram Kale_Shriram Kale_Physical Education": {
    title: "शारीरिक शिक्षण",
    author: "श्रीराम काळे",
    category: "Physical Education",
  },
  "Shet Jameen Mojani Ani Na Satish Joshi_Satish Joshi_Agriculture Practical Guide": {
    title: "शेत जमीन मोजणी",
    author: "सतीश जोशी",
    category: "Agriculture",
  },
  "shetkaryacha asud_Mahatma fule_ autobiography": {
    title: "शेतकऱ्याचा असूड",
    author: "महात्मा फुले",
    category: "Autobiography",
  },
  "Shivaputrasambhajiraje 2 Manoj Shedge_Manoj Shedge_History Biography": {
    title: "शिवपुत्र संभाजीराजे - भाग २",
    author: "मनोज शेडगे",
    category: "History",
  },
  "Somya Gomya Pandurang Suryawanshi_Pandurang Suryawanshi_Short Stories": {
    title: "सोम्या गोम्या",
    author: "पांडुरंग सूर्यवंशी",
    category: "Short Stories",
  },
  "Sukh Samwad Shubhangi Paseband_Shubhangi Paseband_Personal Essays Self Help": {
    title: "सुख संवाद",
    author: "शुभांगी पासेबंद",
    category: "Personal Essays",
  },
  "Sur Tech Chhedita - Mahendra Kapoor_Anant Pavaskar_Music Biography": {
    title: "सूर तेच छेडिता - महेंद्र कपूर",
    author: "अनंत पावसकर",
    category: "Music",
  },
  "To Rajhans Ek. - Shriniwasji Khale_Anant Pavaskar_Music Biography": {
    title: "तो राजहंस एक - श्रीनिवासजी खळे",
    author: "अनंत पावसकर",
    category: "Music",
  },
  "Touring Talkies Shriram Kale_Shriram Kale_Short Story Collection": {
    title: "टुरिंग टॉकीज",
    author: "श्रीराम काळे",
    category: "Short Stories",
  },
  "Tujhi Majhi Jodi Shyam Kulkarni_Shyam Kulkarni_Short Story Collection": {
    title: "तुझी माझी जोडी",
    author: "श्याम कुलकर्णी",
    category: "Short Stories",
  },
  "Vastichi Gaadi Shriram Kale 2025_Shriram Kale_Short Story Collection": {
    title: "वस्तीची गाडी",
    author: "श्रीराम काळे",
    category: "Short Stories",
  },
  "Yayati_V.S. Khandekar_Mythological Fiction Classic": {
    title: "ययाति",
    author: "वि. स. खांडेकर",
    category: "Mythology",
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function findFileByExt(dir, exts) {
  const files = fs.readdirSync(dir);
  for (const ext of exts) {
    const found = files.find(f => f.toLowerCase().endsWith(ext));
    if (found) return path.join(dir, found);
  }
  return null;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  // Connect to shared eLibrary DB
  const mongoUri = process.env.MONGO_URL.replace("<GP_NAME>", "gp_shared_elibrary");
  console.log("\n🔌 Connecting to MongoDB...");
  const conn = await mongoose.createConnection(mongoUri).asPromise();
  const Book = conn.model("Book", bookSchema);
  console.log("✅ Connected to gp_shared_elibrary\n");

  const folders = fs.readdirSync(BOOKS_DIR).filter(f => {
    const fullPath = path.join(BOOKS_DIR, f);
    return fs.statSync(fullPath).isDirectory() && !SKIP_FOLDERS.includes(f);
  });

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const folderName of folders) {
    const folderPath = path.join(BOOKS_DIR, folderName);
    const data = BOOK_DATA[folderName];

    if (!data) {
      console.warn(`⚠️  No Marathi data found for folder: "${folderName}" — SKIPPING`);
      skipCount++;
      continue;
    }

    const { title, author, category } = data;

    // Skip if already exists
    const existing = await Book.findOne({ title });
    if (existing) {
      console.log(`⏭️  Already exists: ${title}`);
      skipCount++;
      continue;
    }

    try {
      // Find cover image (jpg/jpeg/png)
      const coverPath = findFileByExt(folderPath, [".jpg", ".jpeg", ".png"]);
      // Find PDF
      const pdfPath = findFileByExt(folderPath, [".pdf"]);

      if (!pdfPath) {
        console.error(`❌ No PDF found in: ${folderName}`);
        errorCount++;
        continue;
      }

      process.stdout.write(`📤 Uploading: ${title} ... `);

      let coverImage = "", coverImageId = "";
      let pdfFile = "", pdfFileId = "";

      // Upload cover if exists
      if (coverPath) {
        const r = await uploadToR2(coverPath, "elibrary/covers");
        coverImage = r.url;
        coverImageId = r.key;
      }

      // Upload PDF
      const rPdf = await uploadToR2(pdfPath, "elibrary/pdfs");
      pdfFile = rPdf.url;
      pdfFileId = rPdf.key;

      // Insert into DB
      await Book.create({
        title,
        author,
        category,
        coverImage,
        coverImageId,
        pdfFile,
        pdfFileId,
        isProtected: true,
      });

      console.log(`✅ Done`);
      successCount++;

    } catch (err) {
      console.error(`\n❌ Error for "${title}": ${err.message}`);
      errorCount++;
    }
  }

  console.log("\n─────────────────────────────────────────");
  console.log(`✅ Inserted:  ${successCount}`);
  console.log(`⏭️  Skipped:   ${skipCount}`);
  console.log(`❌ Errors:    ${errorCount}`);
  console.log("─────────────────────────────────────────\n");

  await conn.close();
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
