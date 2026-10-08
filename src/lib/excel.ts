import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

export interface PassPairExportRecord {
  sequenceNumber: number;
  batchNumber?: string;
  batchSequence?: number;
  globalSequence?: number;
  passPairId?: string;
  submissionId: string;
  submissionNo: string;
  // Person / Driver fields for EP
  driverName: string;
  dob: string | null;
  age: number | string;
  aadhaarNumber: string | null;
  driverMobile: string | null;
  designation: string;
  licenseNumber: string | null;
  photoBuffer?: Buffer | null;
  photoMimeType?: string;
  companyName: string;
  areaOfWork: string;
  vendorRepresentative: string | null;
  vendorRepMobile: string | null;
  addressTaluka: string | null;
  addressDistrict: string | null;
  addressState: string | null;
  addressPincode: string | null;
  validityRequired: string | null;
  // Vehicle fields for VAP
  vehicleNumber: string;
  vehicleType: string;
  vehicleModel?: string | null;
  modelYear?: string | number | null;
  seatingCapacity?: string | number | null;
  licenseValidTo: string | null;
  insuranceValidTo: string | null;
  pucValidTo: string | null;
  accessArea?: string | null;
  remarks: string | null;
  originalLicense: string;
  originalPuc: string;
  originalInsurance: string;
  // Master Register & Operational Status
  epStatus?: string;
  vapStatus?: string;
  overallStatus?: string;
  mailed?: boolean;
  mailedAt?: string | null;
  mailedByName?: string | null;
  createdAt?: string | null;
  approvedAt?: string | null;
  approvedByName?: string | null;
}

/**
 * Resolves master template file path with robust fallback hierarchy
 */
function getTemplatePath(templateName: "EP" | "VAP"): string {
  const desktopDir = "C:\\Users\\ABHISHEK\\OneDrive\\Desktop";
  const downloadDir = "C:\\Users\\ABHISHEK\\Downloads";
  const projectDir = path.resolve(process.cwd(), "templates");

  if (templateName === "EP") {
    const candidates = [
      path.join(desktopDir, "LATEST EP FORMAT.xlsx"),
      path.join(downloadDir, "LATEST EP FORMAT.xlsx"),
      path.join(projectDir, "LATEST_EP_FORMAT.xlsx"),
      path.join(projectDir, "Event_EP_Template.xlsx"),
      path.join(downloadDir, "Event EP format (2) (3).xlsx"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  } else {
    const candidates = [
      path.join(downloadDir, "LATEST VAP FORMAT.xlsx"),
      path.join(desktopDir, "LATEST VAP FORMAT.xlsx"),
      path.join(projectDir, "LATEST_VAP_FORMAT.xlsx"),
      path.join(projectDir, "Event_VAP_Template.xlsx"),
      path.join(downloadDir, "Event VAP - Format (1).xlsx"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  }

  throw new Error(`Master template for ${templateName} not found.`);
}

/**
 * Calculates approximate age from DOB string (e.g. "14/04/1979", "1979-04-14", "14-04-1979")
 */
export function calculateAge(dobStr: string | null | undefined): string | number {
  if (!dobStr || dobStr.trim() === "" || dobStr === "-") return "";
  const cleaned = dobStr.trim();
  
  // Check if it's already an integer age
  if (/^\d{1,2}$/.test(cleaned)) {
    const num = parseInt(cleaned, 10);
    if (num >= 18 && num <= 85) return num;
  }

  // Parse YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
  let birthYear = 0;
  const parts = cleaned.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      birthYear = parseInt(parts[0], 10);
    } else if (parts[2].length === 4) {
      birthYear = parseInt(parts[2], 10);
    }
  }

  if (birthYear > 1920 && birthYear < 2026) {
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
  }

  return "";
}

/**
 * Generates Official Master EP Excel by loading the exact master template.
 * CRITICAL REQUIREMENT: NO IMAGES ARE INSERTED INTO EP EXCEL.
 * Column F ("PASSPORT SIZE PHOTO") is left completely EMPTY.
 */
export async function generateMasterEPExcel(records: PassPairExportRecord[]): Promise<Buffer> {
  const templatePath = getTemplatePath("EP");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet("Event EP Requisition ") || workbook.worksheets[0];

  // Update top metadata if available
  if (records.length > 0) {
    const primary = records[0];
    if (primary.companyName) {
      const cellA4 = worksheet.getCell("A4");
      const currentVal = String(cellA4.value || "");
      if (!currentVal.includes(primary.companyName)) {
        cellA4.value = `CONTRACTORS :  ${primary.companyName}   Area Of Work : ${primary.areaOfWork || "RG"}`;
      }
    }
    if (primary.vendorRepresentative) {
      worksheet.getCell("B6").value = primary.vendorRepresentative;
    }
    if (primary.vendorRepMobile) {
      worksheet.getCell("E6").value = primary.vendorRepMobile;
    }
  }

  // Clear template placeholder rows (rows 11 to 50)
  for (let r = 11; r <= 50; r++) {
    const row = worksheet.getRow(r);
    for (let c = 1; c <= 8; c++) {
      row.getCell(c).value = null;
    }
  }

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } },
  };

  const centerAlign: Partial<ExcelJS.Alignment> = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  const calibriFont: Partial<ExcelJS.Font> = {
    name: "Calibri",
    size: 11,
  };

  // Populate approved records strictly by sequence number
  for (let i = 0; i < records.length; i++) {
    const item = records[i];
    const rowIndex = 11 + i;
    const row = worksheet.getRow(rowIndex);

    row.height = 95;

    // Col A (1): SL NO (Batch sequence or master sequence)
    const seq = item.batchSequence || item.sequenceNumber || (i + 1);
    const cellA = row.getCell(1);
    cellA.value = seq;
    cellA.font = calibriFont;
    cellA.alignment = centerAlign;
    cellA.border = { ...thinBorder, left: { style: "medium", color: { argb: "FF000000" } } };

    // Col B (2): NAME
    const cellB = row.getCell(2);
    cellB.value = item.driverName ? item.driverName.toUpperCase() : "";
    cellB.font = calibriFont;
    cellB.alignment = centerAlign;
    cellB.border = thinBorder;

    // Col C (3): AGE
    const cellC = row.getCell(3);
    const ageVal = item.age || calculateAge(item.dob);
    cellC.value = ageVal ? (typeof ageVal === "number" ? ageVal : parseInt(String(ageVal), 10) || ageVal) : "";
    cellC.font = calibriFont;
    cellC.alignment = centerAlign;
    cellC.border = thinBorder;

    // Col D (4): AADHAR NO (String formatted, no scientific notation)
    const cellD = row.getCell(4);
    cellD.value = item.aadhaarNumber ? item.aadhaarNumber.replace(/\s+/g, "") : "";
    cellD.font = calibriFont;
    cellD.alignment = centerAlign;
    cellD.numFmt = "@";
    cellD.border = thinBorder;

    // Col E (5): CONTACT NO
    const cellE = row.getCell(5);
    cellE.value = item.driverMobile ? item.driverMobile.replace(/\s+/g, "") : "";
    cellE.font = calibriFont;
    cellE.alignment = centerAlign;
    cellE.numFmt = "@";
    cellE.border = thinBorder;

    // Col F (6): PASSPORT SIZE PHOTO -> INTENTIONALLY EMPTY AS REQUIRED
    const cellF = row.getCell(6);
    cellF.value = null;
    cellF.border = thinBorder;

    // Col G (7): Designation
    const cellG = row.getCell(7);
    cellG.value = item.designation || "Driver";
    cellG.font = calibriFont;
    cellG.alignment = centerAlign;
    cellG.border = thinBorder;

    // Col H (8): Licence Number
    const cellH = row.getCell(8);
    cellH.value = item.licenseNumber || "";
    cellH.font = calibriFont;
    cellH.alignment = centerAlign;
    cellH.border = { ...thinBorder, right: { style: "medium", color: { argb: "FF000000" } } };
  }

  const outputBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(outputBuffer);
}

/**
 * Generates Official Master VAP Excel using the NEW MASTER TEMPLATE (LATEST VAP FORMAT.xlsx).
 * Data starts at Row 3 across 14 columns.
 */
export async function generateMasterVAPExcel(records: PassPairExportRecord[]): Promise<Buffer> {
  const templatePath = getTemplatePath("VAP");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet("VAP") || workbook.worksheets[0];

  // Clear template placeholder rows (rows 3 to 25)
  for (let r = 3; r <= 25; r++) {
    const row = worksheet.getRow(r);
    for (let c = 1; c <= 14; c++) {
      row.getCell(c).value = null;
    }
  }

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } },
  };

  const calibriFont: Partial<ExcelJS.Font> = {
    name: "Calibri",
    size: 11,
  };

  const centerAlign: Partial<ExcelJS.Alignment> = {
    horizontal: "center",
    vertical: "middle",
  };

  // Populate approved records strictly by sequence number
  for (let i = 0; i < records.length; i++) {
    const item = records[i];
    const rowIndex = 3 + i;
    const row = worksheet.getRow(rowIndex);
    row.height = 20;

    const seq = item.batchSequence || item.sequenceNumber || (i + 1);

    // Col A (1): Sr. No.
    const cellA = row.getCell(1);
    cellA.value = seq;
    cellA.font = calibriFont;
    cellA.alignment = centerAlign;
    cellA.border = thinBorder;

    // Col B (2): Vehicle Model
    const cellB = row.getCell(2);
    cellB.value = item.vehicleModel || item.vehicleType || "INNOVA";
    cellB.font = calibriFont;
    cellB.alignment = centerAlign;
    cellB.border = thinBorder;

    // Col C (3): Vehicle Number
    const cellC = row.getCell(3);
    cellC.value = item.vehicleNumber || "";
    cellC.font = calibriFont;
    cellC.alignment = centerAlign;
    cellC.border = thinBorder;

    // Col D (4): Model (year)
    const cellD = row.getCell(4);
    cellD.value = item.modelYear ? (typeof item.modelYear === "number" ? item.modelYear : parseInt(String(item.modelYear), 10) || item.modelYear) : "";
    cellD.font = calibriFont;
    cellD.alignment = centerAlign;
    cellD.border = thinBorder;

    // Col E (5): Seating Capacity (excluding driver)
    const cellE = row.getCell(5);
    cellE.value = item.seatingCapacity || "";
    cellE.font = calibriFont;
    cellE.alignment = centerAlign;
    cellE.border = thinBorder;

    // Col F (6): PUC Validity
    const cellF = row.getCell(6);
    cellF.value = item.pucValidTo || "";
    cellF.font = calibriFont;
    cellF.alignment = centerAlign;
    cellF.border = thinBorder;

    // Col G (7): Insurance Validity
    const cellG = row.getCell(7);
    cellG.value = item.insuranceValidTo || "";
    cellG.font = calibriFont;
    cellG.alignment = centerAlign;
    cellG.border = thinBorder;

    // Col H (8): Chauffeur Name
    const cellH = row.getCell(8);
    cellH.value = item.driverName ? item.driverName.toUpperCase() : "";
    cellH.font = calibriFont;
    cellH.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cellH.border = thinBorder;

    // Col I (9): Contact number
    const cellI = row.getCell(9);
    cellI.value = item.driverMobile ? item.driverMobile.replace(/\s+/g, "") : "";
    cellI.font = calibriFont;
    cellI.alignment = centerAlign;
    cellI.numFmt = "@";
    cellI.border = thinBorder;

    // Col J (10): Aadhar No
    const cellJ = row.getCell(10);
    cellJ.value = item.aadhaarNumber ? item.aadhaarNumber.replace(/\s+/g, "") : "";
    cellJ.font = calibriFont;
    cellJ.alignment = centerAlign;
    cellJ.numFmt = "@";
    cellJ.border = thinBorder;

    // Col K (11): Driver License No
    const cellK = row.getCell(11);
    cellK.value = item.licenseNumber || "";
    cellK.font = calibriFont;
    cellK.alignment = centerAlign;
    cellK.border = thinBorder;

    // Col L (12): Contractor
    const cellL = row.getCell(12);
    cellL.value = item.companyName || "Popular Logistics Ltd";
    cellL.font = calibriFont;
    cellL.alignment = centerAlign;
    cellL.border = thinBorder;

    // Col M (13): Valid Upto
    const cellM = row.getCell(13);
    cellM.value = item.validityRequired || item.insuranceValidTo || "";
    cellM.font = calibriFont;
    cellM.alignment = centerAlign;
    cellM.border = thinBorder;

    // Col N (14): Access Area
    const cellN = row.getCell(14);
    cellN.value = item.accessArea || item.areaOfWork || "Reliance Greens / Site";
    cellN.font = calibriFont;
    cellN.alignment = centerAlign;
    cellN.border = thinBorder;
  }

  const outputBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(outputBuffer);
}

/**
 * Generates the Official Master Register Excel (Control Sheet for all EP/VAP pass pairs).
 */
export async function generateMasterRegisterExcel(records: PassPairExportRecord[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("MASTER_REGISTER", {
    views: [{ showGridLines: true }],
  });

  // Master Register Columns
  const headers = [
    { header: "Batch No", key: "batchNumber", width: 14 },
    { header: "Batch Seq", key: "batchSequence", width: 12 },
    { header: "Global Seq", key: "globalSequence", width: 12 },
    { header: "Pass Pair ID", key: "passPairId", width: 18 },
    { header: "EP Name", key: "epName", width: 26 },
    { header: "Company", key: "company", width: 26 },
    { header: "Designation", key: "designation", width: 16 },
    { header: "Mobile Number", key: "mobileNumber", width: 16 },
    { header: "Vehicle Number", key: "vehicleNumber", width: 18 },
    { header: "Vehicle Type", key: "vehicleType", width: 16 },
    { header: "Driver Name", key: "driverName", width: 26 },
    { header: "Driver Mobile", key: "driverMobile", width: 16 },
    { header: "Vendor", key: "vendor", width: 24 },
    { header: "EP Status", key: "epStatus", width: 14 },
    { header: "VAP Status", key: "vapStatus", width: 14 },
    { header: "Overall Status", key: "overallStatus", width: 16 },
    { header: "Mailed", key: "mailed", width: 12 },
    { header: "Mailed At", key: "mailedAt", width: 20 },
    { header: "Mailed By", key: "mailedBy", width: 18 },
    { header: "Created Date", key: "createdDate", width: 20 },
    { header: "Approved Date", key: "approvedDate", width: 20 },
    { header: "Approved By", key: "approvedBy", width: 18 },
    { header: "Remarks", key: "remarks", width: 28 },
  ];

  worksheet.columns = headers;

  // Title Row at Row 1
  worksheet.spliceRows(1, 0, ["JAMNAGAR PASS MANAGEMENT SYSTEM - MASTER REGISTER"]);
  worksheet.mergeCells("A1:W1");
  const titleRow = worksheet.getRow(1);
  titleRow.height = 32;
  titleRow.getCell(1).font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  // Header Row at Row 2
  const headerRow = worksheet.getRow(2);
  headerRow.height = 26;
  for (let c = 1; c <= headers.length; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF475569" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FF475569" } },
      right: { style: "thin", color: { argb: "FF475569" } },
    };
  }

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };

  // Populate Records
  for (let i = 0; i < records.length; i++) {
    const item = records[i];
    const rowIndex = 3 + i;
    const row = worksheet.getRow(rowIndex);
    row.height = 20;

    const isEven = i % 2 === 1;
    const zebraFill: ExcelJS.Fill = isEven
      ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
      : { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };

    const values = [
      item.batchNumber || "BATCH-001",
      item.batchSequence || item.sequenceNumber || (i + 1),
      item.globalSequence || (i + 1),
      item.passPairId || `PASS-${String(i + 1).padStart(6, "0")}`,
      item.driverName || "",
      item.companyName || "",
      item.designation || "Driver",
      item.driverMobile || "",
      item.vehicleNumber || "",
      item.vehicleType || "",
      item.driverName || "",
      item.driverMobile || "",
      item.companyName || "",
      item.epStatus || "APPROVED",
      item.vapStatus || "APPROVED",
      item.mailed ? "MAILED" : (item.overallStatus || "APPROVED"),
      item.mailed ? "YES" : "NO",
      item.mailedAt || "-",
      item.mailedByName || "-",
      item.createdAt || new Date().toISOString().split("T")[0],
      item.approvedAt || new Date().toISOString().split("T")[0],
      item.approvedByName || "Admin",
      item.remarks || "-",
    ];

    for (let c = 1; c <= values.length; c++) {
      const cell = row.getCell(c);
      cell.value = values[c - 1];
      cell.font = { name: "Calibri", size: 10 };
      cell.fill = zebraFill;
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: (c === 1 || c === 2 || c === 3 || c === 14 || c === 15 || c === 16 || c === 17) ? "center" : "left" };
    }
  }

  const outputBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(outputBuffer);
}
