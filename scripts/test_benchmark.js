const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const JSZip = require("jszip");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runBenchmark() {
  console.log("================================================================");
  console.log("RUNNING BENCHMARK TEST (1, 10, AND 50 APPROVED PASS PAIRS)");
  console.log("================================================================\n");

  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const samplePhoto = fs.readFileSync("uploads/JAMNAGAR/TEST/GJ10AB1234/DRIVER_PHOTO/photo.jpg");

  async function seedBatch(count) {
    await prisma.documentExtraction.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.ePRecord.deleteMany({});
    await prisma.vAPRecord.deleteMany({});
    await prisma.submission.deleteMany({});

    for (let i = 1; i <= count; i++) {
      const sub = await prisma.submission.create({
        data: {
          submissionNo: `JAM-2026-${String(1000 + i).padStart(4, "0")}`,
          status: "APPROVED",
          adminVerified: true,
          fieldVerified: true,
          vehicleNumber: `GJ-10-AB-${String(1000 + i).padStart(4, "0")}`,
          normalizedVehicleNo: `GJ10AB${String(1000 + i).padStart(4, "0")}`,
          vehicleType: "Truck",
          driverName: `Driver Person ${i}`,
          driverMobile: `987901${String(1000 + i).padStart(4, "0")}`,
          driverDob: "15/05/1988",
          companyName: "Popular Logistics Ltd",
          designation: "Driver",
          vendorRepresentative: "Mr. Imtiyaz",
          vendorRepMobile: "9904692000",
          areaOfWork: "RG",
          validityRequired: "1 Month",
          aadhaarNumber: `41666428${String(1000 + i).padStart(4, "0")}`,
          licenseNumber: `GJ172019${String(1000 + i).padStart(5, "0")}`,
          createdById: adminUser.id,
          approvedById: adminUser.id,
          approvedAt: new Date(Date.now() + i * 100),
        },
      });

      const docDir = path.resolve("uploads/JAMNAGAR/TEST", sub.normalizedVehicleNo, "DRIVER_PHOTO");
      fs.mkdirSync(docDir, { recursive: true });
      const docFile = path.join(docDir, "photo.jpg");
      fs.writeFileSync(docFile, samplePhoto);

      await prisma.document.create({
        data: {
          submissionId: sub.id,
          category: "DRIVER_PHOTO",
          filePath: path.relative(process.cwd(), docFile),
          fileName: "photo.jpg",
          fileSize: samplePhoto.length,
          mimeType: "image/jpeg",
        },
      });
    }
  }

  const loginRes = await fetch("http://127.0.0.1:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const token = (await loginRes.json()).token;

  const testCounts = [1, 10, 50];

  for (const count of testCounts) {
    console.log(`\n--- BENCHMARK: ${count} APPROVED PASS PAIRS ---`);
    await seedBatch(count);

    // 1. Validation
    const t0 = performance.now();
    const valRes = await fetch("http://127.0.0.1:3000/api/export/validation", {
      headers: { Authorization: "Bearer " + token },
    });
    const valData = await valRes.json();
    const tVal = Math.round(performance.now() - t0);
    console.log(`Validation (${count} records): valid=${valData.valid}, time=${tVal}ms`);

    // 2. EP Excel Generation
    const t1 = performance.now();
    const epRes = await fetch("http://127.0.0.1:3000/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ exportType: "EP" }),
    });
    const epBuf = await epRes.arrayBuffer();
    const tEp = Math.round(performance.now() - t1);
    console.log(`EP Excel (${count} records with photos): size=${(epBuf.byteLength / 1024).toFixed(1)}KB, time=${tEp}ms`);

    // 3. VAP Excel Generation
    const t2 = performance.now();
    const vapRes = await fetch("http://127.0.0.1:3000/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ exportType: "VAP" }),
    });
    const vapBuf = await vapRes.arrayBuffer();
    const tVap = Math.round(performance.now() - t2);
    console.log(`VAP Excel (${count} records): size=${(vapBuf.byteLength / 1024).toFixed(1)}KB, time=${tVap}ms`);

    // 4. Complete Bundle Generation
    const t3 = performance.now();
    const allRes = await fetch("http://127.0.0.1:3000/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ exportType: "ALL" }),
    });
    const allBuf = await allRes.arrayBuffer();
    const tAll = Math.round(performance.now() - t3);
    console.log(`Export All (${count} records bundle): size=${(allBuf.byteLength / 1024).toFixed(1)}KB, time=${tAll}ms`);
  }

  console.log("\n================================================================");
  console.log("BENCHMARK COMPLETED FOR ALL SCALE LEVELS (1, 10, 50 RECORDS)");
  console.log("================================================================");
}

runBenchmark()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Benchmark failed:", err);
    process.exit(1);
  });
