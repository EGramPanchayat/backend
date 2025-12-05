import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ==========================
// 📌 Upload PDF to Cloudinary
// ==========================
export async function uploadToCloudinary(localFilePath, folderPath, name) {
  try {
    if (!localFilePath) {
      throw new Error("Local PDF file path is missing");
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "raw",                   // IMPORTANT for PDFs
      folder: folderPath,
      public_id: `${name.replace(/\s+/g, "_")}_${Date.now()}`,
      use_filename: true,
      unique_filename: false,
    });

    // delete local temp file
    fs.unlinkSync(localFilePath);

    return {
      url: response.secure_url,
      public_id: response.public_id,
    };

  } catch (err) {
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    throw new Error(`Cloudinary PDF upload failed: ${err.message}`);
  }
}

// ==========================
// 📌 Delete PDF from Cloudinary
// ==========================
export async function deleteFromCloudinary(publicId) {
  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: "raw",   // PDFs must be deleted as raw type
    });
  } catch (err) {
    throw new Error(`Cloudinary PDF delete failed: ${err.message}`);
  }
}
