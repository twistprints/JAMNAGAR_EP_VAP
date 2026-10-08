import crypto from "crypto";
import path from "path";
import JSZip from "jszip";
import { getSupabaseAdmin, ensureStorageBucketExists, STORAGE_BUCKET } from "@/lib/supabase";

/**
 * Normalizes vehicle number string (e.g. "GJ 10 AB 1234" -> "GJ10AB1234")
 */
export function normalizeVehicleNo(vNo: string): string {
  if (!vNo) return "";
  return vNo.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Maps document category to EP or VAP storage group
 */
export function getStorageGroupForCategory(category: string): "EP" | "VAP" | "OTHER" {
  const cat = (category || "").toUpperCase();
  if (cat === "DRIVER_PHOTO" || cat === "PHOTO" || cat === "AADHAAR" || cat === "DRIVING_LICENSE" || cat === "DL") {
    return "EP";
  }
  if (cat === "RC" || cat === "PUC" || cat === "INSURANCE" || cat === "FITNESS" || cat === "PERMIT") {
    return "VAP";
  }
  return "OTHER";
}

/**
 * Builds structured Supabase Storage object path:
 * JAMNAGAR/{YYYY-MM-DD}/{batchNumber}/{passPairId}/{group}/{category}/original{ext}
 */
export function buildDocumentStoragePath(
  dateStr: string,
  batchNumber: string = "BATCH-001",
  passPairId: string = "PASS-000001",
  category: string = "OTHER",
  originalFilename: string = "document.jpg"
): string {
  const dateFormatted = dateStr ? dateStr.split("T")[0] : new Date().toISOString().split("T")[0];
  const safeBatch = (batchNumber || "BATCH-001").replace(/[^a-zA-Z0-9_-]/g, "_").toUpperCase();
  const safePassPair = (passPairId || "PASS-000001").replace(/[^a-zA-Z0-9_-]/g, "_").toUpperCase();
  const catUpper = category.toUpperCase().trim();
  const group = getStorageGroupForCategory(catUpper);
  const ext = path.extname(originalFilename) || ".jpg";

  return `JAMNAGAR/${dateFormatted}/${safeBatch}/${safePassPair}/${group}/${catUpper}/original${ext}`;
}

/**
 * Computes SHA-256 checksum of a file buffer
 */
export function computeFileChecksum(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Uploads a file buffer directly to the private Supabase Storage bucket 'jamnagar-documents'
 */
export async function uploadDocumentToSupabase(
  fileBuffer: Buffer,
  mimeType: string,
  storagePath: string
): Promise<{ success: boolean; path: string; error?: string }> {
  await ensureStorageBucketExists();
  const admin = getSupabaseAdmin();

  if (!admin) {
    return {
      success: false,
      path: storagePath,
      error: "Supabase storage is not configured (SUPABASE_SERVICE_ROLE_KEY missing).",
    };
  }

  try {
    const { error } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType || "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error(`Supabase Storage upload error for ${storagePath}:`, error.message);
      return { success: false, path: storagePath, error: error.message };
    }

    return { success: true, path: storagePath };
  } catch (err: any) {
    console.error(`Supabase Storage upload exception for ${storagePath}:`, err);
    return { success: false, path: storagePath, error: err?.message || "Storage upload failed" };
  }
}

/**
 * Generates a short-lived signed URL (default 300s / 5 mins) for private document access.
 * Does NOT log signed URLs.
 */
export async function getSignedDocumentUrl(
  storagePath: string,
  expiresInSeconds: number = 300
): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin || !storagePath) return null;

  try {
    const { data, error } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return null;
    }

    return data.signedUrl;
  } catch (err: any) {
    return null;
  }
}

/**
 * Downloads a document buffer directly from Supabase Storage server-side.
 */
export async function downloadDocumentBuffer(storagePath: string): Promise<Buffer | null> {
  const admin = getSupabaseAdmin();
  if (!admin || !storagePath) return null;

  try {
    const { data, error } = await admin.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (error || !data) {
      return null;
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    return null;
  }
}

/**
 * Deletes a document object from Supabase Storage
 */
export async function deleteDocumentFromStorage(storagePath: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin || !storagePath) return false;

  try {
    const { error } = await admin.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    return !error;
  } catch (err: any) {
    return false;
  }
}

/**
 * Generates an in-memory ZIP archive of a vehicle's documents downloaded from Supabase Storage
 */
export async function createVehicleBackupZip(
  submission: {
    submissionNo: string;
    normalizedVehicleNo: string;
    vehicleNumber: string;
    vehicleType: string;
    driverName: string;
    companyName: string;
    createdAt: Date | string;
    documents: Array<{
      category: string;
      filePath: string;
      storagePath?: string | null;
      fileName: string;
    }>;
    extractions?: Array<any>;
  }
): Promise<Buffer> {
  const zip = new JSZip();
  const rootFolderName = `${submission.normalizedVehicleNo}_DOCUMENTS`;
  const rootZip = zip.folder(rootFolderName) || zip;

  // Add document files into category folders downloaded from Supabase Storage
  for (const doc of submission.documents) {
    const sPath = doc.storagePath || doc.filePath;
    const fileBuffer = await downloadDocumentBuffer(sPath);
    if (fileBuffer && fileBuffer.length > 0) {
      const catFolder = rootZip.folder(doc.category.toUpperCase());
      if (catFolder) {
        catFolder.file(doc.fileName, fileBuffer);
      }
    }
  }

  // Add metadata JSON
  const metadata = {
    system: "JAMNAGAR PASS MANAGEMENT SYSTEM",
    submissionNo: submission.submissionNo,
    vehicleNumber: submission.vehicleNumber,
    normalizedVehicleNumber: submission.normalizedVehicleNo,
    vehicleType: submission.vehicleType,
    driverName: submission.driverName,
    companyName: submission.companyName,
    exportedAt: new Date().toISOString(),
    documentCount: submission.documents.length,
    documents: submission.documents.map((d) => ({
      category: d.category,
      fileName: d.fileName,
      storagePath: d.storagePath || d.filePath,
    })),
  };

  rootZip.file("submission_metadata.json", JSON.stringify(metadata, null, 2));

  if (submission.extractions && submission.extractions.length > 0) {
    rootZip.file(
      "extracted_data.json",
      JSON.stringify(submission.extractions, null, 2)
    );
  }

  return await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
