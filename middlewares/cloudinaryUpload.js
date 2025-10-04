import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(localFilePath, folderPath, name) {
  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      folder: folderPath,
      public_id: `${name.replace(/\s+/g, "_")}_${Date.now()}`,
    });
    fs.unlinkSync(localFilePath);
    return { url: response.secure_url, public_id: response.public_id };
  } catch (err) {
    console.error("Upload failed:", err);
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    return null;
  }
}

export async function deleteFromCloudinary(publicId) {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Delete failed:", err);
    return null;
  }
}
