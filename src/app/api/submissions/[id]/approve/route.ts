import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAdminResponse, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { normalizeVehicleNo } from "@/lib/storage";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();
    if (user.role !== "ADMIN") return requireAdminResponse();

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
      include: {
        documents: true,
        extractions: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const normVehicleNo = normalizeVehicleNo(submission.vehicleNumber);

    // 1. Update Master Vehicle Record
    let vehicle = await prisma.vehicle.upsert({
      where: { normalizedVehicleNumber: normVehicleNo },
      update: {
        vehicleNumber: submission.vehicleNumber,
        vehicleType: submission.vehicleType,
        chassisNumber: submission.chassisNumber || undefined,
        engineNumber: submission.engineNumber || undefined,
        insuranceValidity: submission.insuranceValidTo || undefined,
        pucValidity: submission.pucValidTo || undefined,
      },
      create: {
        vehicleNumber: submission.vehicleNumber,
        normalizedVehicleNumber: normVehicleNo,
        vehicleType: submission.vehicleType,
        chassisNumber: submission.chassisNumber,
        engineNumber: submission.engineNumber,
        insuranceValidity: submission.insuranceValidTo,
        pucValidity: submission.pucValidTo,
      },
    });

    // 2. Update/Create Master Driver Record
    let driver = await prisma.driver.create({
      data: {
        name: submission.driverName,
        mobile: submission.driverMobile,
        dob: submission.driverDob,
        aadhaarNumber: submission.aadhaarNumber,
        licenseNumber: submission.licenseNumber,
        licenseValidTo: submission.licenseValidTo,
        addressTaluka: submission.addressTaluka,
        addressDistrict: submission.addressDistrict,
        addressState: submission.addressState,
        addressPincode: submission.addressPincode,
      },
    });

    // 3. Mark Submission Approved
    const approvedSubmission = await prisma.submission.update({
      where: { id: params.id },
      data: {
        status: "APPROVED",
        adminVerified: true,
        approvedById: user.userId,
        approvedAt: new Date(),
        vehicleId: vehicle.id,
        driverId: driver.id,
      },
    });

    // 4. Create/Upsert EP Record
    const epCount = await prisma.ePRecord.count();
    await prisma.ePRecord.upsert({
      where: { submissionId: submission.id },
      update: {
        personName: submission.driverName,
        dob: submission.driverDob,
        companyName: submission.companyName,
        designation: submission.designation,
        aadhaarNo: submission.aadhaarNumber,
        validityRequired: submission.validityRequired || "1 Month",
        areaOfWork: submission.areaOfWork,
        taluka: submission.addressTaluka,
        district: submission.addressDistrict,
        state: submission.addressState || "Gujarat",
        pincode: submission.addressPincode,
        mobileNo: submission.driverMobile,
      },
      create: {
        submissionId: submission.id,
        srNo: epCount + 1,
        personName: submission.driverName,
        dob: submission.driverDob,
        companyName: submission.companyName,
        designation: submission.designation,
        aadhaarNo: submission.aadhaarNumber,
        photoUrl: submission.documents.find((d: any) => d.category === "DRIVER_PHOTO")?.fileName || "Available",
        validityRequired: submission.validityRequired || "1 Month",
        areaOfWork: submission.areaOfWork,
        taluka: submission.addressTaluka,
        district: submission.addressDistrict,
        state: submission.addressState || "Gujarat",
        pincode: submission.addressPincode,
        mobileNo: submission.driverMobile,
      },
    });

    // 5. Create/Upsert VAP Record
    await prisma.vAPRecord.upsert({
      where: { submissionId: submission.id },
      update: {
        vehicleNo: submission.vehicleNumber,
        vehicleType: submission.vehicleType,
        driverName: submission.driverName,
        licenseNo: submission.licenseNumber,
        driverMob: submission.driverMobile,
        vendorRep: submission.vendorRepresentative,
        repMob: submission.vendorRepMobile,
      },
      create: {
        submissionId: submission.id,
        vehicleNo: submission.vehicleNumber,
        vehicleType: submission.vehicleType,
        driverName: submission.driverName,
        licenseNo: submission.licenseNumber,
        originalLicensePresent: "Yes",
        originalPucPresent: "Yes",
        originalInsurancePresent: "Yes",
        driverMob: submission.driverMobile,
        vendorRep: submission.vendorRepresentative,
        repMob: submission.vendorRepMobile,
      },
    });

    // 6. Record Audit Log
    await recordAuditLog({
      userId: user.userId,
      userName: user.name,
      action: "APPROVE_SUBMISSION",
      resourceType: "SUBMISSION",
      resourceId: approvedSubmission.id,
      details: {
        submissionNo: approvedSubmission.submissionNo,
        vehicleNo: approvedSubmission.vehicleNumber,
      },
    });

    // 7. Find next pending submission for fast admin workflow
    const nextPending = await prisma.submission.findFirst({
      where: {
        id: { not: params.id },
        status: { in: ["ADMIN_REVIEW", "SUBMITTED"] },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, submissionNo: true, vehicleNumber: true },
    });

    return NextResponse.json({
      success: true,
      message: `Entry ${approvedSubmission.submissionNo} approved successfully!`,
      submission: approvedSubmission,
      nextPendingId: nextPending?.id || null,
      nextPendingNo: nextPending?.submissionNo || null,
    });
  } catch (error: any) {
    console.error("Approve error:", error);
    return NextResponse.json({ error: error?.message || "Failed to approve submission." }, { status: 500 });
  }
}
