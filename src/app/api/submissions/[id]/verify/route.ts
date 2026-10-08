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
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const body = await req.json();
    const { fields, remarks } = body;

    if (!fields) {
      return NextResponse.json({ error: "Fields payload is required." }, { status: 400 });
    }

    // Build update object
    const updateData: any = {
      lastModifiedById: user.userId,
      remarks: remarks !== undefined ? remarks : submission.remarks,
    };

    if (fields.vehicleNumber) {
      updateData.vehicleNumber = fields.vehicleNumber.trim();
      updateData.normalizedVehicleNo = normalizeVehicleNo(fields.vehicleNumber);
    }
    if (fields.vehicleType) updateData.vehicleType = fields.vehicleType.trim();
    if (fields.driverName) updateData.driverName = fields.driverName.trim();
    if (fields.driverMobile !== undefined) updateData.driverMobile = fields.driverMobile?.trim() || null;
    if (fields.driverDob !== undefined) updateData.driverDob = fields.driverDob?.trim() || null;
    if (fields.companyName) updateData.companyName = fields.companyName.trim();
    if (fields.designation) updateData.designation = fields.designation;
    if (fields.vendorRepresentative !== undefined) updateData.vendorRepresentative = fields.vendorRepresentative?.trim() || null;
    if (fields.vendorRepMobile !== undefined) updateData.vendorRepMobile = fields.vendorRepMobile?.trim() || null;
    if (fields.addressTaluka !== undefined) updateData.addressTaluka = fields.addressTaluka?.trim() || null;
    if (fields.addressDistrict !== undefined) updateData.addressDistrict = fields.addressDistrict?.trim() || null;
    if (fields.addressState !== undefined) updateData.addressState = fields.addressState?.trim() || "Gujarat";
    if (fields.addressPincode !== undefined) updateData.addressPincode = fields.addressPincode?.trim() || null;
    if (fields.areaOfWork) updateData.areaOfWork = fields.areaOfWork;
    if (fields.validityRequired !== undefined) updateData.validityRequired = fields.validityRequired?.trim() || "1 Month";
    if (fields.aadhaarNumber !== undefined) updateData.aadhaarNumber = fields.aadhaarNumber?.trim() || null;
    if (fields.licenseNumber !== undefined) updateData.licenseNumber = fields.licenseNumber?.trim() || null;
    if (fields.licenseValidTo !== undefined) updateData.licenseValidTo = fields.licenseValidTo?.trim() || null;
    if (fields.insurancePolicyNo !== undefined) updateData.insurancePolicyNo = fields.insurancePolicyNo?.trim() || null;
    if (fields.insuranceCompany !== undefined) updateData.insuranceCompany = fields.insuranceCompany?.trim() || null;
    if (fields.insuranceValidTo !== undefined) updateData.insuranceValidTo = fields.insuranceValidTo?.trim() || null;
    if (fields.pucCertificateNo !== undefined) updateData.pucCertificateNo = fields.pucCertificateNo?.trim() || null;
    if (fields.pucValidTo !== undefined) updateData.pucValidTo = fields.pucValidTo?.trim() || null;
    if (fields.rcOwnerName !== undefined) updateData.rcOwnerName = fields.rcOwnerName?.trim() || null;
    if (fields.chassisNumber !== undefined) updateData.chassisNumber = fields.chassisNumber?.trim() || null;
    if (fields.engineNumber !== undefined) updateData.engineNumber = fields.engineNumber?.trim() || null;

    // Track field audit changes
    for (const [key, val] of Object.entries(fields)) {
      const oldVal = (submission as any)[key] || null;
      const newVal = val !== null && val !== undefined ? String(val) : null;
      if (oldVal !== newVal) {
        await prisma.submissionFieldAudit.create({
          data: {
            submissionId: submission.id,
            fieldName: key,
            manualValue: oldVal,
            finalValue: newVal,
            verifiedById: user.userId,
            verifiedByName: user.name,
            verifiedAt: new Date(),
          },
        });
      }
    }

    const updated = await prisma.submission.update({
      where: { id: params.id },
      data: updateData,
      include: {
        documents: true,
        extractions: true,
        fieldAudits: true,
      },
    });

    await recordAuditLog({
      userId: user.userId,
      userName: user.name,
      action: "ADMIN_VERIFY_SAVE",
      resourceType: "SUBMISSION",
      resourceId: updated.id,
      details: { modifiedFields: Object.keys(fields) },
    });

    return NextResponse.json({
      success: true,
      message: "Verification changes saved successfully.",
      submission: updated,
    });
  } catch (error: any) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: error?.message || "Failed to save verification." }, { status: 500 });
  }
}
