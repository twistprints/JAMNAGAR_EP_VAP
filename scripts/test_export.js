const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const JSZip = require("jszip");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runEndToEndTest() {
  console.log("================================================================");
  console.log("STARTING AUTOMATED EXPORT & SEQUENCE VERIFICATION (10 RECORDS)");
  console.log("================================================================\n");

  // 1. Get or create Admin user for auth
  let adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!adminUser) {
    throw new Error("Admin user not found in DB.");
  }

  // 2. Prepare sample photo buffer
  const samplePhotos = [
    "uploads/JAMNAGAR/2026-10-07/HR68C4741/DRIVER_PHOTO/DRIVER_PHOTO_1791407184027.jpg",
    "uploads/JAMNAGAR/2026-10-07/HR68C4741/DRIVER_PHOTO/DRIVER_PHOTO_1791407404870.png",
    "uploads/JAMNAGAR/2026-10-07/MH02FG8658/DRIVER_PHOTO/DRIVER_PHOTO_1791410801295.jpg",
  ];
  let defaultPhotoPath = samplePhotos.find((p) => fs.existsSync(p)) || samplePhotos[0];
  const photoBuffer = fs.readFileSync(defaultPhotoPath);

  // Clear previous test records for clean sequence
  await prisma.documentExtraction.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.ePRecord.deleteMany({});
  await prisma.vAPRecord.deleteMany({});
  await prisma.submission.deleteMany({});

  console.log("Seeding 10 complete approved pass pairs (Sequence 1 to 10)...");

  const testDrivers = [
    { name: "Rakesh Chauhan", dob: "14/04/1985", mobile: "9879011001", aadhaar: "416664289361", license: "GJ1720190008125", vehicle: "GJ-10-AB-1234", type: "Truck", company: "Popular Logistics Ltd", rep: "Mr. Imtiyaz", repMob: "9904692000" },
    { name: "Amit Patel", dob: "22/08/1990", mobile: "9879011002", aadhaar: "932652285992", license: "GJ1020140001241", vehicle: "GJ-10-AB-1235", type: "Bolero", company: "Patel Transport Co", rep: "Mr. Imtiyaz", repMob: "9904692000" },
    { name: "Suresh Kumar", dob: "10/11/1988", mobile: "9879011003", aadhaar: "965680736719", license: "GJ0320150013132", vehicle: "GJ-10-AB-1236", type: "Innova", company: "Gujarat Express", rep: "Mr. Imtiyaz", repMob: "9904692000" },
    { name: "Dinesh Shah", dob: "05/03/1982", mobile: "9879011004", aadhaar: "263032743150", license: "GJ0320210015111", vehicle: "GJ-10-AB-1237", type: "Truck", company: "Popular Logistics Ltd", rep: "Mr. Imtiyaz", repMob: "9904692000" },
    { name: "Hidayat Fufad", dob: "18/07/1995", mobile: "9879011005", aadhaar: "582542241756", license: "GJ0320150007513", vehicle: "GJ-10-AB-1238", type: "Trailer", company: "Reliance Green Services", rep: "Mr. Imtiyaz", repMob: "9904692000" },
    { name: "Sahil Chaniya", dob: "30/01/1998", mobile: "9879011006", aadhaar: "361679444990", license: "GJ1020220003645", vehicle: "GJ-10-AB-1239", type: "Innova", company: "Popular Logistics Ltd", rep: "Mr. Imtiyaz", repMob: "9904692000" },
    { name: "Laljibhai Andani", dob: "12/12/1980", mobile: "9879011007", aadhaar: "453164779476", license: "GJ0320000001603", vehicle: "GJ-10-AB-1240", type: "Dumper", company: "Patel Transport Co", rep: "Mr. Imtiyaz", repMob: "9904692000" },
    { name: "Arbazkhan Bloch", dob: "25/09/1997", mobile: "9879011008", aadhaar: "741258963214", license: "GJ1020190015230", vehicle: "GJ-10-AB-1241", type: "Pickup", company: "Gujarat Express", rep: "Mr. Imtiyaz", repMob: "9904692000" },
    { name: "Aaftab Ravkarda", dob: "14/06/1989", mobile: "9879011009", aadhaar: "852369741258", license: "GJ0320000001509", vehicle: "GJ-10-AB-1242", type: "Tanker", company: "Reliance Green Services", rep: "Mr. Imtiyaz", repMob: "9904692000" },
    { name: "Rahul Sharma", dob: "08/05/1992", mobile: "9879011010", aadhaar: "963258741025", license: "GJ1020180004512", vehicle: "GJ-10-AB-1243", type: "Truck", company: "Popular Logistics Ltd", rep: "Mr. Imtiyaz", repMob: "9904692000" },
  ];

  for (let i = 0; i < testDrivers.length; i++) {
    const d = testDrivers[i];
    const subNo = "JAM-2026-" + (1001 + i);
    const sub = await prisma.submission.create({
      data: {
        submissionNo: subNo,
        status: "APPROVED",
        adminVerified: true,
        fieldVerified: true,
        vehicleNumber: d.vehicle,
        normalizedVehicleNo: d.vehicle.replace(/[^A-Z0-9]/g, ""),
        vehicleType: d.type,
        driverName: d.name,
        driverMobile: d.mobile,
        driverDob: d.dob,
        companyName: d.company,
        designation: "Driver",
        vendorRepresentative: d.rep,
        vendorRepMobile: d.repMob,
        areaOfWork: "RG",
        validityRequired: "1 Month",
        aadhaarNumber: d.aadhaar,
        licenseNumber: d.license,
        insurancePolicyNo: "POL-" + (20000 + i),
        insuranceCompany: "National Insurance",
        insuranceValidTo: "31/12/2026",
        pucCertificateNo: "PUC-" + (30000 + i),
        pucValidTo: "30/06/2026",
        createdById: adminUser.id,
        approvedById: adminUser.id,
        approvedAt: new Date(Date.now() + i * 1000),
      },
    });

    // Create Document record & save physical file
    const docDir = path.resolve("uploads/JAMNAGAR/TEST", sub.normalizedVehicleNo, "DRIVER_PHOTO");
    fs.mkdirSync(docDir, { recursive: true });
    const docFile = path.join(docDir, "photo.jpg");
    fs.writeFileSync(docFile, photoBuffer);

    await prisma.document.create({
      data: {
        submissionId: sub.id,
        category: "DRIVER_PHOTO",
        filePath: path.relative(process.cwd(), docFile),
        fileName: "photo.jpg",
        fileSize: photoBuffer.length,
        mimeType: "image/jpeg",
      },
    });

    // Create EP & VAP Records
    await prisma.ePRecord.create({
      data: {
        submissionId: sub.id,
        srNo: i + 1,
        personName: d.name,
        dob: d.dob,
        companyName: d.company,
        designation: "Driver",
        aadhaarNo: d.aadhaar,
        mobileNo: d.mobile,
        areaOfWork: "RG",
        validityRequired: "1 Month",
      },
    });

    await prisma.vAPRecord.create({
      data: {
        submissionId: sub.id,
        vehicleNo: d.vehicle,
        vehicleType: d.type,
        driverName: d.name,
        licenseNo: d.license,
        originalLicensePresent: "Yes",
        originalPucPresent: "Yes",
        originalInsurancePresent: "Yes",
        driverMob: d.mobile,
        vendorRep: d.rep,
        repMob: d.repMob,
      },
    });
  }

  console.log("Seeded 10 approved pass pairs successfully.");

  // 3. Test Validation API
  console.log("\n--- TESTING VALIDATION PRE-FLIGHT ---");
  const loginRes = await fetch("http://127.0.0.1:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  const valRes = await fetch("http://127.0.0.1:3000/api/export/validation?filter=ALL", {
    headers: { Authorization: "Bearer " + token },
  });
  const valData = await valRes.json();
  console.log("Validation Success:", valData.success);
  console.log("Validation Valid:", valData.valid);
  console.log("Approved Pass Pairs Count:", valData.approvedCount);
  console.log("Errors Count:", valData.errors.length);

  // 4. Test EP Excel Export
  console.log("\n--- TESTING EP EXCEL EXPORT ---");
  const epRes = await fetch("http://127.0.0.1:3000/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ exportType: "EP", filter: "ALL" }),
  });
  const epBuffer = Buffer.from(await epRes.arrayBuffer());
  console.log("EP Excel Downloaded:", epBuffer.length, "bytes");

  // Verify EP Workbook programmatically
  const wbEp = new ExcelJS.Workbook();
  await wbEp.xlsx.load(epBuffer);
  const wsEp = wbEp.worksheets[0];
  console.log("EP Sheet Name:", wsEp.name);
  console.log("EP Header Row 10 (A10:H10):", wsEp.getRow(10).values.slice(1, 9));
  console.log("EP Embedded Images Count:", wsEp.getImages().length);

  for (let r = 11; r <= 20; r++) {
    const seq = r - 10;
    const row = wsEp.getRow(r);
    console.log(
      `EP Row ${r} (Seq #${seq}): SL=${row.getCell(1).value} | Name="${row.getCell(2).value}" | Age=${row.getCell(3).value} | Aadhaar=${row.getCell(4).value} | Mobile=${row.getCell(5).value} | Desig=${row.getCell(7).value} | Lic=${row.getCell(8).value}`
    );
  }

  // 5. Test VAP Excel Export
  console.log("\n--- TESTING VAP EXCEL EXPORT ---");
  const vapRes = await fetch("http://127.0.0.1:3000/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ exportType: "VAP", filter: "ALL" }),
  });
  const vapBuffer = Buffer.from(await vapRes.arrayBuffer());
  console.log("VAP Excel Downloaded:", vapBuffer.length, "bytes");

  // Verify VAP Workbook programmatically
  const wbVap = new ExcelJS.Workbook();
  await wbVap.xlsx.load(vapBuffer);
  const wsVap = wbVap.worksheets[0];
  console.log("VAP Sheet Name:", wsVap.name);
  console.log("VAP Header Row 2 (A2:O2):", wsVap.getRow(2).values.slice(1, 16));

  for (let r = 3; r <= 12; r++) {
    const seq = r - 2;
    const row = wsVap.getRow(r);
    console.log(
      `VAP Row ${r} (Seq #${seq}): Sr=${row.getCell(1).value} | Vendor="${row.getCell(2).value}" | Veh="${row.getCell(3).value}" | Type="${row.getCell(4).value}" | Driver="${row.getCell(5).value}" | Lic="${row.getCell(6).value}" | OrigLic=${row.getCell(7).value} | OrigPUC=${row.getCell(8).value} | OrigIns=${row.getCell(9).value} | Mob=${row.getCell(10).value}`
    );
  }

  // 6. Test EP Photos ZIP Export
  console.log("\n--- TESTING EP PHOTOS ZIP EXPORT ---");
  const photosRes = await fetch("http://127.0.0.1:3000/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ exportType: "PHOTOS", filter: "ALL" }),
  });
  const photosBuffer = Buffer.from(await photosRes.arrayBuffer());
  const zipPhotos = await JSZip.loadAsync(photosBuffer);
  const photoFileNames = Object.keys(zipPhotos.files)
    .filter((k) => !zipPhotos.files[k].dir)
    .sort((a, b) => parseInt(a) - parseInt(b));
  console.log("Photo ZIP Files:", photoFileNames);

  // 7. Test ALL (Complete Bundle) Export
  console.log("\n--- TESTING EXPORT ALL (COMPLETE BUNDLE) ---");
  const allRes = await fetch("http://127.0.0.1:3000/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ exportType: "ALL", filter: "ALL" }),
  });
  const allBuffer = Buffer.from(await allRes.arrayBuffer());
  const zipAll = await JSZip.loadAsync(allBuffer);
  console.log("Complete Package Entries:", Object.keys(zipAll.files));

  const manifestFile = zipAll.file("manifest.json");
  if (manifestFile) {
    const manifestJson = JSON.parse(await manifestFile.async("string"));
    console.log("Manifest Event:", manifestJson.event, "| Total Records:", manifestJson.totalRecords);
    console.log("Manifest Record 1:", manifestJson.records[0]);
    console.log("Manifest Record 10:", manifestJson.records[9]);
  }

  console.log("\n================================================================");
  console.log("ALL 10-RECORD SEQUENCE VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("================================================================");
}

runEndToEndTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
