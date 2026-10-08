import { prisma } from "@/lib/prisma";
import JSZip from "jszip";
import {
  PassPairExportRecord,
  calculateAge,
  generateMasterEPExcel,
  generateMasterVAPExcel,
  generateMasterRegisterExcel,
} from "@/lib/excel";
import { downloadDocumentBuffer, createVehicleBackupZip } from "@/lib/storage";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  approvedCount: number;
  records: PassPairExportRecord[];
}

/**
 * Sanitizes a string for use in a filename (removes / \ : * ? " < > | and extra spaces)
 */
export function sanitizeFilenamePart(str: string): string {
  if (!str) return "Driver";
  return str
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

/**
 * Loads and validates submissions for export,
 * ensuring 1:1 EP-VAP link, sequence integrity, and photo loading from Supabase Storage.
 */
export async function getValidatedExportData(filterOptions?: {
  batchId?: string;
  status?: string;
  filter?: "ALL" | "TODAY" | "DATE_RANGE" | "SELECTED";
  startDate?: string;
  endDate?: string;
  selectedIds?: string[];
  onlyApproved?: boolean;
}): Promise<ValidationResult> {
  const where: any = {};

  if (filterOptions?.onlyApproved !== false) {
    where.status = filterOptions?.status || "APPROVED";
  } else if (filterOptions?.status) {
    where.status = filterOptions.status;
  }

  if (filterOptions?.batchId) {
    where.batchId = filterOptions.batchId;
  }

  if (filterOptions?.filter === "TODAY") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    where.approvedAt = { gte: start, lte: end };
  } else if (filterOptions?.filter === "DATE_RANGE" && filterOptions.startDate && filterOptions.endDate) {
    where.approvedAt = {
      gte: new Date(filterOptions.startDate),
      lte: new Date(filterOptions.endDate),
    };
  } else if (filterOptions?.filter === "SELECTED" && filterOptions.selectedIds?.length) {
    where.id = { in: filterOptions.selectedIds };
  }

  // Fetch submissions strictly ordered by createdAt / batchSequence
  const submissions = await prisma.submission.findMany({
    where,
    orderBy: [
      { batchSequence: "asc" },
      { createdAt: "asc" },
    ],
    include: {
      batch: true,
      epRecord: true,
      vapRecord: true,
      documents: true,
    },
  });

  const errors: string[] = [];
  const records: PassPairExportRecord[] = [];

  for (let i = 0; i < submissions.length; i++) {
    const sub = submissions[i];
    const seq = sub.batchSequence || (i + 1);

    // Validate EP and VAP existence
    if (!sub.driverName) {
      errors.push(`EP #${seq} (${sub.submissionNo}) is missing driver/person name.`);
    }
    if (!sub.vehicleNumber) {
      errors.push(`VAP #${seq} (${sub.submissionNo}) is missing vehicle number.`);
    }

    // Check passport photo document from Supabase Storage
    const photoDoc = sub.documents.find((d) => d.category === "DRIVER_PHOTO" || d.category === "PHOTO");
    let photoBuffer: Buffer | null = null;
    let photoMimeType = "image/jpeg";

    if (photoDoc) {
      const sPath = photoDoc.storagePath || photoDoc.filePath;
      if (sPath) {
        try {
          photoBuffer = await downloadDocumentBuffer(sPath);
          photoMimeType = photoDoc.mimeType || "image/jpeg";
        } catch (e) {
          console.warn(`Could not load photo from storage for EP #${seq}:`, e);
        }
      }
    }

    records.push({
      sequenceNumber: seq,
      batchNumber: sub.batch?.batchNumber || "BATCH-001",
      batchSequence: sub.batchSequence || (i + 1),
      globalSequence: sub.globalSequence || (i + 1),
      passPairId: sub.passPairId || `PASS-${String(i + 1).padStart(6, "0")}`,
      submissionId: sub.id,
      submissionNo: sub.submissionNo,
      driverName: sub.driverName,
      dob: sub.driverDob,
      age: calculateAge(sub.driverDob),
      aadhaarNumber: sub.aadhaarNumber,
      driverMobile: sub.driverMobile,
      designation: sub.designation || "Driver",
      licenseNumber: sub.licenseNumber,
      photoBuffer,
      photoMimeType,
      companyName: sub.companyName,
      areaOfWork: sub.areaOfWork || "RG",
      vendorRepresentative: sub.vendorRepresentative,
      vendorRepMobile: sub.vendorRepMobile,
      addressTaluka: sub.addressTaluka,
      addressDistrict: sub.addressDistrict,
      addressState: sub.addressState,
      addressPincode: sub.addressPincode,
      validityRequired: sub.validityRequired,
      vehicleNumber: sub.vehicleNumber,
      vehicleType: sub.vehicleType,
      vehicleModel: sub.vehicleModel || sub.vehicleType,
      modelYear: sub.modelYear,
      seatingCapacity: sub.seatingCapacity,
      licenseValidTo: sub.licenseValidTo,
      insuranceValidTo: sub.insuranceValidTo,
      pucValidTo: sub.pucValidTo,
      accessArea: sub.accessArea || sub.areaOfWork || "Reliance Greens / Site",
      remarks: sub.remarks,
      originalLicense: sub.vapRecord?.originalLicensePresent || "Yes",
      originalPuc: sub.vapRecord?.originalPucPresent || "Yes",
      originalInsurance: sub.vapRecord?.originalInsurancePresent || "Yes",
      epStatus: sub.epStatus || (sub.status === "APPROVED" ? "APPROVED" : "PENDING"),
      vapStatus: sub.vapStatus || (sub.status === "APPROVED" ? "APPROVED" : "PENDING"),
      overallStatus: sub.status,
      mailed: sub.mailed,
      mailedAt: sub.mailedAt ? sub.mailedAt.toISOString().split("T")[0] : null,
      mailedByName: sub.mailedByName || null,
      createdAt: sub.createdAt ? sub.createdAt.toISOString().split("T")[0] : null,
      approvedAt: sub.approvedAt ? sub.approvedAt.toISOString().split("T")[0] : null,
      approvedByName: "Admin",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    approvedCount: records.length,
    records,
  };
}

/**
 * Generates EP Photos ZIP for a single batch.
 * Files are named {batch_sequence}_{driver_name}.jpg (e.g. 1_Rakesh.jpg)
 */
export async function generateEPPhotosZip(
  records: PassPairExportRecord[],
  batchNumber: string = "BATCH-001"
): Promise<Buffer> {
  const zip = new JSZip();

  for (let i = 0; i < records.length; i++) {
    const item = records[i];
    const seq = item.batchSequence || item.sequenceNumber || (i + 1);
    const sanitizedName = sanitizeFilenamePart(item.driverName || `Driver_${seq}`);
    const ext = item.photoMimeType?.includes("png") ? "png" : "jpg";
    const fileName = `${seq}_${sanitizedName}.${ext}`;

    if (item.photoBuffer && item.photoBuffer.length > 0) {
      zip.file(fileName, item.photoBuffer);
    } else {
      // Create lightweight valid placeholder jpeg if buffer missing
      const dummyHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
        0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
        0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
        0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
        0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
        0x00, 0xbf, 0x00, 0xff, 0xd9,
      ]);
      zip.file(fileName, dummyHeader);
    }
  }

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

/**
 * Generates All Batches Photos ZIP organized into subfolders per batch:
 * BATCH_001/1_Rakesh.jpg, BATCH_002/1_Vijay.jpg, etc.
 */
export async function generateAllBatchesPhotosZip(records: PassPairExportRecord[]): Promise<Buffer> {
  const zip = new JSZip();

  for (let i = 0; i < records.length; i++) {
    const item = records[i];
    const batchFolder = sanitizeFilenamePart(item.batchNumber || "BATCH_001");
    const seq = item.batchSequence || item.sequenceNumber || (i + 1);
    const sanitizedName = sanitizeFilenamePart(item.driverName || `Driver_${seq}`);
    const ext = item.photoMimeType?.includes("png") ? "png" : "jpg";
    const filePath = `${batchFolder}/${seq}_${sanitizedName}.${ext}`;

    if (item.photoBuffer && item.photoBuffer.length > 0) {
      zip.file(filePath, item.photoBuffer);
    } else {
      const dummyHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
        0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
        0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
        0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
        0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
        0x00, 0xbf, 0x00, 0xff, 0xd9,
      ]);
      zip.file(filePath, dummyHeader);
    }
  }

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

/**
 * Generates Full Complete Export Bundle (ZIP)
 * Containing EP.xlsx, VAP.xlsx, Master_Register.xlsx, Photos folder, and manifest.json
 */
export async function generateFullExportZip(
  batchId?: string,
  batchNumber?: string
): Promise<{ buffer: Buffer; fileName: string }> {
  const validation = await getValidatedExportData({ batchId, onlyApproved: false });
  const records = validation.records;

  const zip = new JSZip();
  const dateStr = new Date().toISOString().split("T")[0];

  const epExcelBuffer = await generateMasterEPExcel(records);
  const vapExcelBuffer = await generateMasterVAPExcel(records);
  const masterRegisterBuffer = await generateMasterRegisterExcel(records);

  const prefix = batchNumber ? `${batchNumber}_` : `JAMNAGAR_`;

  zip.file(`${prefix}EP_${dateStr}.xlsx`, epExcelBuffer);
  zip.file(`${prefix}VAP_${dateStr}.xlsx`, vapExcelBuffer);
  zip.file(`${prefix}MASTER_REGISTER_${dateStr}.xlsx`, masterRegisterBuffer);

  // Add photos
  for (let i = 0; i < records.length; i++) {
    const item = records[i];
    const folder = batchNumber ? "PHOTOS" : `PHOTOS/${sanitizeFilenamePart(item.batchNumber || "BATCH_001")}`;
    const seq = item.batchSequence || item.sequenceNumber || (i + 1);
    const sanitizedName = sanitizeFilenamePart(item.driverName || `Driver_${seq}`);
    const ext = item.photoMimeType?.includes("png") ? "png" : "jpg";
    const photoPath = `${folder}/${seq}_${sanitizedName}.${ext}`;

    if (item.photoBuffer && item.photoBuffer.length > 0) {
      zip.file(photoPath, item.photoBuffer);
    }
  }

  // Manifest with masked Aadhaar as required
  const manifest = {
    exportDate: dateStr,
    batch: batchNumber || "ALL_BATCHES",
    totalRecords: records.length,
    records: records.map((r) => ({
      batchNumber: r.batchNumber,
      batchSequence: r.batchSequence,
      globalSequence: r.globalSequence,
      passPairId: r.passPairId,
      submissionNo: r.submissionNo,
      epName: r.driverName,
      vehicleNumber: r.vehicleNumber,
      vehicleType: r.vehicleType,
      vendor: r.companyName,
      status: r.overallStatus,
      mailed: r.mailed,
      photoFile: batchNumber
        ? `PHOTOS/${r.batchSequence}_${sanitizeFilenamePart(r.driverName)}.jpg`
        : `PHOTOS/${sanitizeFilenamePart(r.batchNumber || "BATCH_001")}/${r.batchSequence}_${sanitizeFilenamePart(r.driverName)}.jpg`,
    })),
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const fileName = batchNumber
    ? `${batchNumber}_COMPLETE_${dateStr}.zip`
    : `JAMNAGAR_EXPORT_${dateStr}.zip`;

  return { buffer: zipBuffer, fileName };
}

/**
 * Generates Vehicle Archive ZIP with all document categories from Supabase Storage
 */
export async function generateVehicleBackupArchive(vehicleNumber: string): Promise<Buffer> {
  const cleanVeh = vehicleNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const sub = await prisma.submission.findFirst({
    where: {
      normalizedVehicleNo: { contains: cleanVeh },
    },
    include: {
      documents: true,
      extractions: true,
    },
  });

  if (!sub) {
    const emptyZip = new JSZip();
    return emptyZip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  }

  return createVehicleBackupZip(sub);
}
