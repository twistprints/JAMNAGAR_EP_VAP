import fs from "fs";
import path from "path";
import JSZip from "jszip";

const BASE_STORAGE_DIR = path.resolve(process.cwd(), "uploads", "JAMNAGAR");

export function normalizeVehicleNo(vNo: string): string {
  if (!vNo) return "";
  return vNo.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function getVehicleFolder(dateStr: string, normalizedVehicleNo: string): string {
  const dateFormatted = dateStr ? dateStr.split("T")[0] : new Date().toISOString().split("T")[0];
  const targetDir = path.join(BASE_STORAGE_DIR, dateFormatted, normalizedVehicleNo);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}

export function getCategoryFolder(dateStr: string, normalizedVehicleNo: string, category: string): string {
  const vehicleDir = getVehicleFolder(dateStr, normalizedVehicleNo);
  const catDir = path.join(vehicleDir, category.toUpperCase());
  if (!fs.existsSync(catDir)) {
    fs.mkdirSync(catDir, { recursive: true });
  }
  return catDir;
}

export async function saveDocumentFile(
  fileBuffer: Buffer,
  dateStr: string,
  normalizedVehicleNo: string,
  category: string,
  originalFilename: string
): Promise<{ relativePath: string; fullPath: string; fileName: string }> {
  const catDir = getCategoryFolder(dateStr, normalizedVehicleNo, category);
  const ext = path.extname(originalFilename) || ".jpg";
  const timestamp = Date.now();
  const safeName = `${category.toUpperCase()}_${timestamp}${ext}`;
  const fullPath = path.join(catDir, safeName);

  await fs.promises.writeFile(fullPath, fileBuffer);

  // Relative path from project root for storage in DB
  const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");

  return { relativePath, fullPath, fileName: safeName };
}

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
      fileName: string;
    }>;
    extractions?: Array<any>;
  }
): Promise<Buffer> {
  const zip = new JSZip();
  const rootFolderName = `${submission.normalizedVehicleNo}_DOCUMENTS`;
  const rootZip = zip.folder(rootFolderName) || zip;

  // Add document files into category folders
  for (const doc of submission.documents) {
    const fullPath = path.resolve(process.cwd(), doc.filePath);
    if (fs.existsSync(fullPath)) {
      const fileData = await fs.promises.readFile(fullPath);
      const catFolder = rootZip.folder(doc.category.toUpperCase());
      if (catFolder) {
        catFolder.file(doc.fileName, fileData);
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
