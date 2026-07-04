import mongoose from "mongoose";

const SiteConfigSchema = new mongoose.Schema({
  // Village Identity
  villageName: { type: String, default: "" },
  gpName: { type: String, default: "" },
  taluka: { type: String, default: "" },
  district: { type: String, default: "" },
  state: { type: String, default: "" },
  pincode: { type: String, default: "" },

  // Hero Section
  heroTitle: { type: String, default: "" },
  heroSubtitle: { type: String, default: "" },
  heroImage: { type: String, default: "/images/village.png" },

  // Stats Cards
  stats: [{
    icon: String,
    number: String,
    label: String,
  }],

  // About Section
  aboutTitle: { type: String, default: "गावाची माहिती" },
  aboutParagraphs: [String],

  // Slogans (ticker)
  slogans: [String],

  // Contact Info
  contact: {
    address: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    officeHours: { type: String, default: "" },
    googleMapsEmbedUrl: { type: String, default: "" },
    mapCaption: { type: String, default: "" },
  },

  // Useful Links (footer)
  usefulLinks: [{
    label: String,
    url: String,
  }],

  // Famous Places
  places: [{
    name: String,
    image: String,
    description: String,
  }],

  // Social Reformers
  reformers: [{
    name: String,
    image: String,
    description: String,
  }],

  // Emergency Contacts
  emergencyContacts: [{
    emoji: String,
    title: String,
    number: String,
  }],

  // Government Schemes / Services
  services: [{
    title: String,
    description: String,
    iconSvg: String,
    iconColor: String,
  }],
}, { timestamps: true });

export default SiteConfigSchema;
