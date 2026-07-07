import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Check if credentials are present, otherwise log warning
const checkCredentials = () => {
  const required = [
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_ACCESS_KEY_ID",
    "CLOUDFLARE_SECRET_ACCESS_KEY",
    "CLOUDFLARE_R2_BUCKET_NAME",
    "CLOUDFLARE_R2_PUBLIC_URL"
  ];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`[R2 Client Warning]: Missing environment variables: ${missing.join(", ")}`);
  }
};

let s3Client = null;

const getS3Client = () => {
  if (!s3Client) {
    checkCredentials();
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || "dummy",
        secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || "dummy",
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
};

// Helper to map file extensions to mime-types
const getMimeType = (ext) => {
  const mimeMap = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif"
  };
  return mimeMap[ext.toLowerCase()] || "application/octet-stream";
};

/**
 * Uploads a file from local disk to Cloudflare R2
 * @param {string} filePath - Absolute path to the local temp file
 * @param {string} folder - Folder name in the bucket (e.g. "elibrary/covers")
 * @param {string} originalName - Original filename to preserve ext
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const uploadToR2 = async (filePath, folder, originalName) => {
  const client = getS3Client();
  const ext = path.extname(filePath) || path.extname(originalName) || "";
  const key = `${folder}/${uuidv4()}${ext}`;

  const fileBuffer = fs.readFileSync(filePath);

  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME || "dummy-bucket",
    Key: key,
    Body: fileBuffer,
    ContentType: getMimeType(ext),
  });

  await client.send(command);

  // Return the public URL and the unique key as public_id
  const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL 
    ? process.env.CLOUDFLARE_R2_PUBLIC_URL.replace(/\/$/, "")
    : `https://${process.env.CLOUDFLARE_R2_BUCKET_NAME}.r2.cloudflarestorage.com`;

  return {
    url: `${publicBaseUrl}/${key}`,
    public_id: key,
  };
};

/**
 * Deletes an object from Cloudflare R2 using its key
 * @returns {Promise<void>}
 */
export const deleteFromR2 = async (key) => {
  if (!key) return;
  const client = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME || "dummy-bucket",
    Key: key,
  });
  await client.send(command);
};
