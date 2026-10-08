const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function clearDemoData() {
  console.log("================================================================");
  console.log("PURGING ALL DEMO & TEST DATA FROM SYSTEM");
  console.log("================================================================");

  // 1. Delete audit logs, extractions, documents, records, submissions
  const auditsDeleted = await prisma.submissionFieldAudit.deleteMany({});
  console.log(`✓ Deleted ${auditsDeleted.count} field audits`);

  const extractionsDeleted = await prisma.documentExtraction.deleteMany({});
  console.log(`✓ Deleted ${extractionsDeleted.count} AI document extractions`);

  const docsDeleted = await prisma.document.deleteMany({});
  console.log(`✓ Deleted ${docsDeleted.count} document records`);

  const epDeleted = await prisma.ePRecord.deleteMany({});
  console.log(`✓ Deleted ${epDeleted.count} EP records`);

  const vapDeleted = await prisma.vAPRecord.deleteMany({});
  console.log(`✓ Deleted ${vapDeleted.count} VAP records`);

  const subsDeleted = await prisma.submission.deleteMany({});
  console.log(`✓ Deleted ${subsDeleted.count} submissions / pass pairs`);

  const exportBatchesDeleted = await prisma.exportBatch.deleteMany({});
  console.log(`✓ Deleted ${exportBatchesDeleted.count} export batch history logs`);

  const batchesDeleted = await prisma.batch.deleteMany({});
  console.log(`✓ Deleted ${batchesDeleted.count} submission batches`);

  const vehiclesDeleted = await prisma.vehicle.deleteMany({});
  console.log(`✓ Deleted ${vehiclesDeleted.count} vehicles`);

  const driversDeleted = await prisma.driver.deleteMany({});
  console.log(`✓ Deleted ${driversDeleted.count} drivers`);

  const vendorsDeleted = await prisma.vendor.deleteMany({});
  console.log(`✓ Deleted ${vendorsDeleted.count} vendors`);

  const auditLogsDeleted = await prisma.auditLog.deleteMany({});
  console.log(`✓ Deleted ${auditLogsDeleted.count} audit logs`);

  // 2. Ensure standard clean users exist
  const bcrypt = require("bcryptjs");
  const adminPassHash = await bcrypt.hash("admin123", 10);
  const fieldPassHash = await bcrypt.hash("field123", 10);

  // Reset users to pristine Admin & Field User
  await prisma.user.deleteMany({});

  await prisma.user.create({
    data: {
      username: "admin",
      name: "Jamnagar Pass Administrator",
      email: "admin@jamnagar.gov.in",
      passwordHash: adminPassHash,
      role: "ADMIN",
      active: true,
    },
  });

  await prisma.user.create({
    data: {
      username: "field",
      name: "Jamnagar Field Verification Officer",
      email: "field@jamnagar.gov.in",
      passwordHash: fieldPassHash,
      role: "FIELD_USER",
      active: true,
    },
  });

  console.log("✓ Reset clean production users (admin / admin123 and field / field123)");

  // 3. Clean up test uploads directory if exists
  const testPhotosDir = path.resolve("public/uploads/test_photos");
  if (fs.existsSync(testPhotosDir)) {
    fs.rmSync(testPhotosDir, { recursive: true, force: true });
    console.log("✓ Removed temporary test uploads folder.");
  }

  console.log("\n================================================================");
  console.log("ALL DEMO DATA HAS BEEN COMPLETELY PURGED! DATABASE IS PRISTINE & READY.");
  console.log("================================================================");
}

clearDemoData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
