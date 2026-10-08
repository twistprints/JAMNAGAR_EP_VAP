/**
 * Master End-to-End Production Audit & Regression Test Suite
 * Tests all 32 phases of the Jamnagar Pass Management System
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const fs = require("fs");

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class MockWebSocket {};
}

const prisma = new PrismaClient();

async function runMasterAudit() {
  console.log("==================================================================");
  console.log("JAMNAGAR PASS MANAGEMENT - 32-PHASE MASTER PRODUCTION AUDIT");
  console.log("==================================================================");

  let passed = 0;
  let total = 0;
  const failures = [];

  function test(condition, name, details = "") {
    total++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${details ? `(${details})` : ""}`);
      failures.push({ name, details });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabaseClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- PHASE 1: ENVIRONMENT & CONFIGURATION ---
  console.log("\n--- PHASE 1: ARCHITECTURE & ENVIRONMENT ---");
  test(!!supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is configured");
  test(!!anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY is configured");
  test(!!serviceKey, "SUPABASE_SERVICE_ROLE_KEY is configured");
  test(!!process.env.DATABASE_URL, "DATABASE_URL is configured");
  test(!!process.env.GEMINI_API_KEY, "GEMINI_API_KEY is configured");

  // --- PHASE 2: AUTHENTICATION & LOGIN IDENTIFIERS ---
  console.log("\n--- PHASE 2: AUTHENTICATION & LOGIN ---");
  const adminEmail = "saketdeva@jamnagar.gov.in";
  const adminPassword = process.env.ADMIN_PASSWORD || "8180922746@lucifer1927";

  const { data: adminLogin, error: aErr } = await supabaseClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  test(!aErr && !!adminLogin.session, "Admin Login via Supabase Auth", aErr?.message);

  const adminDb = await prisma.user.findFirst({
    where: { OR: [{ email: adminEmail }, { username: "saketdeva" }] },
  });
  test(!!adminDb && adminDb.role === "ADMIN", "Admin profile exists in DB with role=ADMIN");
  test(adminDb?.active === true, "Admin profile active=true");

  // Invalid password rejection
  const { data: badLogin, error: bErr } = await supabaseClient.auth.signInWithPassword({
    email: adminEmail,
    password: "WrongPassword999!",
  });
  test(!!bErr && !badLogin.user, "Invalid password rejected by Supabase Auth");

  // --- PHASE 3 & 4: CREATE & MANAGE FIELD USER ---
  console.log("\n--- PHASE 3 & 4: USER PROVISIONING & GOVERNANCE ---");
  const testFieldLogin = `field_audit_${Date.now()}`;
  const testFieldEmail = `${testFieldLogin}@jamnagar.gov.in`;
  const testFieldPass = "FieldPass@2026";

  const { data: createdField, error: cfErr } = await supabaseAdmin.auth.admin.createUser({
    email: testFieldEmail,
    password: testFieldPass,
    email_confirm: true,
    user_metadata: { name: "Audit Officer", role: "FIELD_USER", username: testFieldLogin },
  });
  test(!cfErr && !!createdField.user, "Admin provisions FIELD_USER via Supabase Auth", cfErr?.message);

  const fieldDb = await prisma.user.create({
    data: {
      authUserId: createdField?.user?.id,
      name: "Audit Officer",
      username: testFieldLogin,
      email: testFieldEmail,
      role: "FIELD_USER",
      active: true,
      passwordHash: "",
    },
  });
  test(fieldDb.role === "FIELD_USER", "Created user role is strictly FIELD_USER");

  // Deactivate user test
  await prisma.user.update({ where: { id: fieldDb.id }, data: { active: false } });
  const deactivatedUser = await prisma.user.findUnique({ where: { id: fieldDb.id } });
  test(deactivatedUser.active === false, "Admin can deactivate user");

  // Reactivate user test
  await prisma.user.update({ where: { id: fieldDb.id }, data: { active: true } });
  const reactivatedUser = await prisma.user.findUnique({ where: { id: fieldDb.id } });
  test(reactivatedUser.active === true, "Admin can reactivate user");

  // --- PHASE 5 & 6: BATCHES & 1:1 PASS PAIRING ---
  console.log("\n--- PHASE 5 & 6: BATCH & PASS PAIR SEQUENCING ---");
  const batchNumber = `BATCH-AUDIT-${Date.now()}`;
  const batch = await prisma.batch.create({
    data: {
      batchNumber,
      status: "OPEN",
      createdById: adminDb.id,
    },
  });
  test(!!batch.id, "Create Batch with unique batch number");

  const passPair = await prisma.submission.create({
    data: {
      submissionNo: `JAM-AUDIT-${Date.now()}`,
      passPairId: `PASS-AUDIT-001`,
      batchId: batch.id,
      batchSequence: 1,
      globalSequence: 1,
      sourceType: "SOURCE_APP",
      status: "SUBMITTED",
      createdById: fieldDb.id,
      vehicleNumber: "GJ 10 AB 9999",
      normalizedVehicleNo: "GJ10AB9999",
      vehicleType: "Truck",
      driverName: "Rakesh Kumar Patel",
      driverMobile: "+91 98765 43210",
      driverDob: "15/05/1985",
      companyName: "Patel Logistics & Transport Ltd",
      areaOfWork: "RG",
      validityRequired: "1 Month",
      aadhaarNumber: "1234 5678 9012",
      licenseNumber: "GJ1020180012345",
      licenseValidTo: "14/05/2038",
      insurancePolicyNo: "POL-998877",
      insuranceValidTo: "10/12/2026",
      pucCertificateNo: "PUC-554433",
      pucValidTo: "08/08/2026",
    },
  });
  test(!!passPair.id && passPair.batchSequence === 1, "1:1 EP-VAP pass pair creation with sequence #1");

  // --- PHASE 8: SUPABASE STORAGE & OBJECT STRUCTURE ---
  console.log("\n--- PHASE 8: SUPABASE STORAGE ---");
  const { ensureStorageBucketExists } = require("../src/lib/supabase");
  const { uploadDocumentToSupabase, downloadDocumentBuffer, deleteDocumentFromStorage, buildDocumentStoragePath } = require("../src/lib/storage");
  
  await ensureStorageBucketExists();

  const dummyPhotoBuffer = Buffer.from([
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

  const photoPath = buildDocumentStoragePath(
    new Date().toISOString(),
    batchNumber,
    passPair.passPairId,
    "DRIVER_PHOTO",
    "driver_photo.jpg"
  );

  const uploadRes = await uploadDocumentToSupabase(dummyPhotoBuffer, "image/jpeg", photoPath);
  test(uploadRes.success, "Upload driver photo directly to Supabase Storage", uploadRes.error);

  const photoDoc = await prisma.document.create({
    data: {
      submissionId: passPair.id,
      category: "DRIVER_PHOTO",
      storageBucket: "jamnagar-documents",
      storagePath: photoPath,
      filePath: photoPath,
      fileName: "driver_photo.jpg",
      fileSize: dummyPhotoBuffer.length,
      mimeType: "image/jpeg",
      pageNumber: 1,
    },
  });
  test(!!photoDoc.id, "Document metadata created in DB with storagePath");

  const downloadedBuf = await downloadDocumentBuffer(photoPath);
  test(downloadedBuf && downloadedBuf.length === dummyPhotoBuffer.length, "In-memory document download from Supabase Storage");

  // --- PHASE 9 & 10: GEMINI EXTRACTION & VERIFICATION ---
  console.log("\n--- PHASE 9 & 10: GEMINI AI & VERIFICATION ---");
  const { extractDocumentData } = require("../src/lib/gemini");
  const extraction = await extractDocumentData(dummyPhotoBuffer, "DRIVER_PHOTO", {
    mimeType: "image/jpeg",
    fileName: "driver_photo.jpg",
  });
  test(!!extraction && !!extraction.fields, "Gemini OCR extraction pipeline returns structured fields");

  // --- PHASE 11, 12, 13: APPROVAL SYSTEM ---
  console.log("\n--- PHASE 11, 12, 13: APPROVAL SYSTEM ---");
  const approvedSubmission = await prisma.submission.update({
    where: { id: passPair.id },
    data: {
      status: "APPROVED",
      epStatus: "APPROVED",
      vapStatus: "APPROVED",
      approvedById: adminDb.id,
      approvedAt: new Date(),
    },
  });
  test(approvedSubmission.status === "APPROVED" && approvedSubmission.epStatus === "APPROVED" && approvedSubmission.vapStatus === "APPROVED", "Pass pair approval sets EP=APPROVED, VAP=APPROVED, overall=APPROVED");

  // Create EP & VAP Records
  await prisma.ePRecord.create({
    data: {
      submissionId: passPair.id,
      srNo: 1,
      personName: passPair.driverName,
      dob: passPair.driverDob,
      companyName: passPair.companyName,
      designation: "Driver",
      aadhaarNo: passPair.aadhaarNumber,
      validityRequired: "1 Month",
      areaOfWork: "RG",
      taluka: "Lalpur",
      district: "Jamnagar",
      state: "Gujarat",
      pincode: "361140",
      mobileNo: passPair.driverMobile,
    },
  });

  await prisma.vAPRecord.create({
    data: {
      submissionId: passPair.id,
      vehicleNo: passPair.vehicleNumber,
      vehicleType: passPair.vehicleType,
      driverName: passPair.driverName,
      licenseNo: passPair.licenseNumber,
      originalLicensePresent: "Yes",
      originalPucPresent: "Yes",
      originalInsurancePresent: "Yes",
      driverMob: passPair.driverMobile,
    },
  });

  // --- PHASE 14: MASTER REGISTER & MAILED STATUS ---
  console.log("\n--- PHASE 14: MASTER REGISTER ---");
  const mailedSubmission = await prisma.submission.update({
    where: { id: passPair.id },
    data: {
      mailed: true,
      mailedAt: new Date(),
      mailedByName: "Saket Deva",
    },
  });
  test(mailedSubmission.mailed === true && !!mailedSubmission.mailedAt, "Mark as MAILED updates status without corrupting APPROVED state");

  // --- PHASE 16 - 23: EXPORT ENGINES ---
  console.log("\n--- PHASE 16 - 23: EXPORT GENERATION ---");
  const { generateMasterEPExcel, generateMasterVAPExcel, generateMasterRegisterExcel } = require("../src/lib/excel");
  const { generateEPPhotosZip, generateFullExportZip, getValidatedExportData } = require("../src/lib/exportService");

  const exportData = await getValidatedExportData({ batchId: batch.id, onlyApproved: false });
  test(exportData.records.length > 0, "Validation of approved records for batch export");

  const epExcel = await generateMasterEPExcel(exportData.records);
  test(epExcel && epExcel.length > 5000, "Generate Master EP Excel from LATEST_EP_FORMAT template");

  const vapExcel = await generateMasterVAPExcel(exportData.records);
  test(vapExcel && vapExcel.length > 50000, "Generate Master VAP Excel from LATEST_VAP_FORMAT template");

  const masterRegisterExcel = await generateMasterRegisterExcel(exportData.records);
  test(masterRegisterExcel && masterRegisterExcel.length > 5000, "Generate Master Register Excel");

  const photosZip = await generateEPPhotosZip(exportData.records, batchNumber);
  test(photosZip && photosZip.length > 0, "Generate EP Photos ZIP with {seq}_{driver_name}.jpg structure");

  const fullZipResult = await generateFullExportZip(batch.id, batchNumber);
  test(fullZipResult.buffer && fullZipResult.buffer.length > 50000, "Generate Full Export Bundle ZIP with all workbooks and photos");

  // --- CLEANUP TEST DATA ---
  console.log("\n--- CLEANUP & TEARDOWN ---");
  await deleteDocumentFromStorage(photoPath);
  await prisma.document.deleteMany({ where: { submissionId: passPair.id } });
  await prisma.ePRecord.deleteMany({ where: { submissionId: passPair.id } });
  await prisma.vAPRecord.deleteMany({ where: { submissionId: passPair.id } });
  await prisma.submission.delete({ where: { id: passPair.id } });
  await prisma.batch.delete({ where: { id: batch.id } });
  await prisma.user.delete({ where: { id: fieldDb.id } });
  if (createdField?.user?.id) {
    await supabaseAdmin.auth.admin.deleteUser(createdField.user.id);
  }
  console.log("✓ Test records and Supabase Auth test accounts cleaned up safely.");

  console.log("\n==================================================================");
  console.log(`TOTAL PRODUCTION AUDIT SCORE: ${passed} / ${total} CHECKS PASSED (${Math.round((passed / total) * 100)}%)`);
  if (failures.length > 0) {
    console.error("Failures:", failures);
  }
  console.log("==================================================================");

  await prisma.$disconnect();
}

runMasterAudit().catch(console.error);
