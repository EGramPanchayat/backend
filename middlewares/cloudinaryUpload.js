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
    resource_type: "auto",
    type: "upload",             // ensures it's in the public upload namespace
    access_mode: "public",      // ensures it's publicly accessible
    overwrite: true,            // replace if same name
    use_filename: true,         // use your given name instead of random ID
  });


    // delete local file after upload
    fs.unlinkSync(localFilePath);

    return { url: response.secure_url, public_id: response.public_id };
  } catch (err) {
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    throw new Error(`Cloudinary upload failed: ${err.message}`);
  }
}

export async function deleteFromCloudinary(publicId) {
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: "auto" }); // ✅ works for all file types
  } catch (err) {
    throw new Error(`Cloudinary delete failed: ${err.message}`);
  }
}
