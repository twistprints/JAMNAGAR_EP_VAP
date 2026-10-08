import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { reconcileSubmissionData } from "@/lib/reconciliation";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();

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

    if (submission.createdById !== user.userId && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    // Optional updated body fields if field user edited during review
    const body = await req.json().catch(() => ({}));
    const updatedFields: any = {};
    if (body.vehicleNumber) updatedFields.vehicleNumber = body.vehicleNumber.trim();
    if (body.driverName) updatedFields.driverName = body.driverName.trim();
    if (body.driverMobile) updatedFields.driverMobile = body.driverMobile.trim();
    if (body.driverDob) updatedFields.driverDob = body.driverDob.trim();
    if (body.companyName) updatedFields.companyName = body.companyName.trim();
    if (body.designation) updatedFields.designation = body.designation;
    if (body.addressTaluka) updatedFields.addressTaluka = body.addressTaluka.trim();
    if (body.addressDistrict) updatedFields.addressDistrict = body.addressDistrict.trim();
    if (body.addressState) updatedFields.addressState = body.addressState.trim();
    if (body.addressPincode) updatedFields.addressPincode = body.addressPincode.trim();
    if (body.areaOfWork) updatedFields.areaOfWork = body.areaOfWork;
    if (body.validityRequired) updatedFields.validityRequired = body.validityRequired.trim();

    // Reconcile and compute mismatch count
    const recon = reconcileSubmissionData(
      {
        vehicleNumber: updatedFields.vehicleNumber || submission.vehicleNumber,
        driverName: updatedFields.driverName || submission.driverName,
        driverDob: updatedFields.driverDob || submission.driverDob,
        driverMobile: updatedFields.driverMobile || submission.driverMobile,
        companyName: updatedFields.companyName || submission.companyName,
        addressPincode: updatedFields.addressPincode || submission.addressPincode,
      },
      submission.extractions
    );

    const updated = await prisma.submission.update({
      where: { id: params.id },
      data: {
        ...updatedFields,
        status: "ADMIN_REVIEW",
        currentStep: 5,
        fieldVerified: true,
        mismatchCount: recon.mismatchCount,
        submittedAt: new Date(),
        lastModifiedById: user.userId,
      },
      include: {
        documents: true,
        extractions: true,
      },
    });

    await recordAuditLog({
      userId: user.userId,
      userName: user.name,
      action: "FIELD_VERIFY_SUBMIT",
      resourceType: "SUBMISSION",
      resourceId: updated.id,
      details: {
        submissionNo: updated.submissionNo,
        mismatches: recon.mismatchCount,
        matches: recon.matchCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Submission completed and sent for Admin verification.",
      submission: updated,
    });
  } catch (error: any) {
    console.error("Submit error:", error);
    return NextResponse.json({ error: error?.message || "Failed to submit." }, { status: 500 });
  }
}
