/**
 * Seed Script: Populates SiteConfig and GovernmentOfficials for gpGomevadi
 * 
 * Run once: node seedSiteConfig.js
 * 
 * This takes ALL the existing hardcoded data from the frontend 
 * and inserts it into MongoDB.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import SiteConfigSchema from "./DB/models/siteConfig.js";
import GovernmentOfficialSchema from "./DB/models/governmentOfficial.js";

dotenv.config();

const GP_NAME = "gpGomevadi";
const MONGO_URL = process.env.MONGO_URL.replace("<GP_NAME>", GP_NAME);

async function seed() {
  console.log(`Connecting to DB: ${GP_NAME}...`);
  const conn = await mongoose.createConnection(MONGO_URL).asPromise();
  console.log("Connected!");

  const SiteConfig = conn.model("SiteConfig", SiteConfigSchema);
  const GovOfficial = conn.model("GovernmentOfficial", GovernmentOfficialSchema);

  // ══════════════════════════════════════════════
  // 1. SITE CONFIG — All static village data
  // ══════════════════════════════════════════════

  const siteConfigData = {
    // Village Identity
    villageName: "गोमेवाडी",
    gpName: "ग्रामपंचायत गोमेवाडी",
    taluka: "आटपाडी",
    district: "सांगली",
    state: "महाराष्ट्र",
    pincode: "415 308",

    // Hero Section
    heroTitle: "ग्रामपंचायत गोमेवाडी मध्ये स्वागत आहे",
    heroSubtitle: "ता.आटपाडी  जि.सांगली",
    heroImage: "/images/village.png",

    // Stats Cards
    stats: [
      { icon: "🌾", number: "2200", label: "हेक्टर क्षेत्रफळ" },
      { icon: "🏘", number: "4", label: "वार्ड संख्या" },
      { icon: "👥", number: "3,711", label: "एकूण लोकसंख्या" },
      { icon: "🏠", number: "758", label: "कुटुंब संख्या" },
    ],

    // About Section
    aboutTitle: "गावाची माहिती",
    aboutParagraphs: [
      `गोमेवाडी हे <span class="text-orange-500 font-semibold">महाराष्ट्र राज्यातील सांगली जिल्ह्यातील आटपाडी तालुक्यातील</span> एक प्रगतशील व ऐतिहासिक गाव आहे. २०११ च्या जनगणनेनुसार या गावाची लोकसंख्या सुमारे <span class="text-orange-500 font-semibold">3711</span> आहे. गावामध्ये जिल्हा परिषद प्राथमिक शाळा 4, अंगणवाडी केंद्रे 8, माध्यमिक विद्यालय 1, वाचनालय 1, व्यायामशाळा 1 अशी शैक्षणिक व शारीरिक सुविधा उपलब्ध आहेत. तसेच <span class="text-orange-500 font-semibold">गणपती मंदिर</span> हे प्रसिद्ध देवस्थान आहे.`,
      `गावातील बहुतांश लोकांचा मुख्य व्यवसाय <span class="text-orange-500 font-semibold">शेती</span> असून अधिकतर <span class="text-orange-500 font-semibold">ज्वारी, गहू ,डाळिंब , ऊस </span> ही प्रमुख पिके घेतली जातात. डाळिंब व ऊस या पिकांच्या लागवडीमुळे गावातील शेतकऱ्यांना चांगले उत्पन्न मिळते. गोमेवाडी ग्रामपंचायतीत विविध शासकीय योजना प्रभावीपणे राबविल्या गेल्या आहेत. <span class="text-orange-500 font-semibold">स्वच्छ भारत अभियान</span> अंतर्गत गोमेवाडी गावाने संपूर्ण <span class="text-orange-500 font-semibold"> खुले शौचमुक्त (ODF+)</span> दर्जा मिळवला आहे.`,
    ],

    // Slogans (ticker)
    slogans: [
      "एकच ध्येय, स्वच्छ आणि समृद्ध गाव!",
      "चला, एकत्र येऊया, गाव सुंदर बनवूया!",
      "ग्रामपंचायत: गाव विकासाचे केंद्र!",
      "आपला ग्रामविकास, आपले योगदान!",
      "पंचायत राज, स्वयंपूर्ण महाराष्ट्र.",
    ],

    // Contact Info
    contact: {
      address: "ग्रामपंचायत गोमेवाडी,\nतालुका आटपाडी,\nजिल्हा सांगली,\nमहाराष्ट्र - 415 308.",
      email: "grampanchayatgomewadi@gmail.com",
      phone: "",
      officeHours: "सकाळी 10:00 ते संध्याकाळी 5:00",
      googleMapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3782.217234234234!2d74.9631234!3d17.425678!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc1234567890abc%3A0xabcdef1234567890!2sGomewadi%2C%20Atpadi%2C%20Sangli%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1699999999999!5m2!1sen!2sin",
      mapCaption: "Gomewadi, तालुका आटपाडी, जिल्हा सांगली",
    },

    // Useful Links (footer)
    usefulLinks: [
      { label: "महाराष्ट्र सरकार", url: "https://rdd.maharashtra.gov.in/" },
      { label: "जिल्हा परिषद सांगली", url: "https://zpsangli.maharashtra.gov.in/" },
    ],

    // Famous Places
    places: [
      {
        name: "गणपती मंदिर",
        image: "/images/ganeshMandir.jpg",
        description: "गावाचे ग्रामदैवत असलेले गणपती मंदिर गावकऱ्यांचे प्रमुख श्रद्धास्थान आहे. एक गाव एक गणपती या संकल्पनेतून गणेश उत्सव साजरा केला जातो. यानिमित्त गावामध्ये यात्रा भरवली जाते. मंदिर गोमेवाडी गावाच्या मध्यभागी, मुख्य रस्त्याजवळ स्थित असल्यामुळे भाविकांसाठी ते सहज उपलब्ध आहे.",
      },
      {
        name: "अर्जुनवाडी तलाव",
        image: "/images/talav.jpg",
        description: "अर्जुनवाडी तलाव गावाच्या पश्चिम भागात स्थित आहे. पावसाळ्यात तलावाचे सौंदर्य अधिक खुलते, आणि हे ट्रेकिंगसाठी एक लोकप्रिय ठिकाण आहे. आसपास पिकनिक स्पॉट्स उपलब्ध आहेत. पर्यटकांना येथे शांततादायी आणि नैसर्गिक वातावरण अनुभवता येते.",
      },
    ],

    // Social Reformers
    reformers: [
      { name: "शिवाजी महाराज", image: "/images/shivajiMaharaj.webp", description: "महान मराठा वीर" },
      { name: "शाहू महाराज", image: "/images/shahumaharaj.jpeg", description: "सामाजिक सुधारक" },
      { name: "सावित्रीबाई फुले", image: "/images/savitribai.png", description: "महिला शिक्षा प्रणेता" },
      { name: "लोकमान्य तिळक", image: "/images/lokmanya.jpeg", description: "स्वातंत्र्य सेनानी" },
      { name: "डॉ. बाबासाहेब आंबेडकर", image: "/images/babasaheb.webp", description: "संविधान निर्माता" },
      { name: "ज्योतिबा फुले", image: "/images/jotiba.jpg", description: "समाज सुधारक" },
    ],

    // Emergency Contacts
    emergencyContacts: [
      { emoji: "🚓", title: "पोलीस", number: "१००" },
      { emoji: "🚑", title: "रूग्णवाहिका", number: "१०८" },
      { emoji: "🔥", title: "अग्निशमन", number: "१०१" },
      { emoji: "💉", title: "रक्तपेढी", number: "१०४" },
      { emoji: "⚡", title: "महापरीषण", number: "१९१२" },
    ],

    // Government Schemes / Services
    services: [
      {
        title: "स्वच्छ भारत मिशन",
        description: "ग्रामिण व शहरी भागात स्वच्छता अभियान राबविण्याची योजना.",
        iconSvg: '<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21h18M4 17l4-8m4 8l4-8" />',
        iconColor: "text-green-600",
      },
      {
        title: "डिजिटल अंगणवाडी",
        description: "अंगणवाडी केंद्रांना आधुनिक तंत्रज्ञानाने सक्षम करण्ये.",
        iconSvg: '<circle cx="12" cy="8" r="4" /><rect x="6" y="14" width="12" height="6" rx="3" />',
        iconColor: "text-blue-500",
      },
      {
        title: "डिजिटल शाळा",
        description: "विद्यालयांना डिजिटल शिक्षण सुविधा उपलब्ध करून देणे.",
        iconSvg: '<path d="M12 3L2 9l10 6 10-6-10-6z" /><path d="M2 9v6a2 2 0 002 2h16a2 2 0 002-2V9" />',
        iconColor: "text-indigo-600",
      },
      {
        title: "डिजिटल ग्रामपंचायत",
        description: "ग्रामपंचायत कार्यप्रणालीमध्ये डिजिटलायझेशनचा समावेश.",
        iconSvg: '<rect x="4" y="8" width="16" height="12" rx="2" /><rect x="9" y="12" width="6" height="8" rx="1" />',
        iconColor: "text-yellow-500",
      },
      {
        title: "शाळा व अंगणवाडी CCTV",
        description: "विद्यालयांच्या सुरक्षिततेसाठी सीसीटीव्ही सुविधा.",
        iconSvg: '<rect x="3" y="7" width="18" height="10" rx="2" /><circle cx="12" cy="12" r="3" />',
        iconColor: "text-red-500",
      },
      {
        title: "अ\u200dॅक्वा आरओ शुद्ध पाणी प्रकल्प",
        description: "गावात शुद्ध पिण्याचे पाणी उपलब्ध करण्याची योजना.",
        iconSvg: '<path d="M12 2C12 2 7 8 7 12a5 5 0 0010 0c0-4-5-10-5-10z" />',
        iconColor: "text-blue-400",
      },
    ],
  };

  // Delete existing and insert fresh
  await SiteConfig.deleteMany({});
  const savedConfig = await SiteConfig.create(siteConfigData);
  console.log("✅ SiteConfig seeded successfully!");

  // ═══════════════════════════════════════════════════
  // 2. GOVERNMENT OFFICIALS
  // ═══════════════════════════════════════════════════

  const officialsData = [
    {
      role: "माननीय मुख्यमंत्री",
      name: "श्री. देवेंद्र फडणवीस",
      image: "/images/devendraFadanwis.webp",
      order: 0,
    },
    {
      role: "माननीय उपमुख्यमंत्री",
      name: "श्री. एकनाथ शिंदे",
      image: "/images/yeknathShinde.jpeg",
      order: 1,
    },
    {
      role: "माननीय उपमुख्यमंत्री",
      name: "श्रीमती सुनेत्रा अजित पवार",
      image: "/images/SUNETRA-PAWAR.jpg",
      order: 2,
    },
    {
      role: "माननीय मंत्री, ग्रामविकास व पंचायतराज विभाग",
      name: "श्री. जयकुमार गोरे",
      image: "/images/jayKumar.jpeg",
      order: 3,
    },
    {
      role: "माननीय राज्यमंत्री, ग्रामविकास व पंचायतराज विभाग",
      name: "श्री. योगेश कदम",
      image: "/images/yogeshKadam.png",
      order: 4,
    },
    {
      role: "प्रधान सचिव, ग्रामविकास व पंचायतराज विभाग",
      name: "श्री. एकनाथ डवळे",
      image: "/images/yeknathDwale.png",
      order: 5,
    },
  ];

  await GovOfficial.deleteMany({});
  const savedOfficials = await GovOfficial.insertMany(officialsData);
  console.log(`✅ ${savedOfficials.length} Government Officials seeded successfully!`);

  // Done
  await conn.close();
  console.log("\n🎉 Seeding complete! Database connection closed.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
