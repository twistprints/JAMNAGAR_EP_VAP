import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reconcileSubmissionData } from "@/lib/reconciliation";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { id: true, name: true, username: true } },
        approvedBy: { select: { id: true, name: true, username: true } },
        documents: {
          orderBy: [{ category: "asc" }, { pageNumber: "asc" }],
        },
        extractions: {
          orderBy: { createdAt: "asc" },
        },
        fieldAudits: {
          orderBy: { verifiedAt: "asc" },
        },
        epRecord: true,
        vapRecord: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    // Role check: field users can only view their own submissions unless public within organization
    if (user.role === "FIELD_USER" && submission.createdById !== user.userId) {
      return NextResponse.json(
        { error: "Access denied to this submission." },
        { status: 403 }
      );
    }

    // Calculate reconciliation report
    const reconciliation = reconcileSubmissionData(
      {
        vehicleNumber: submission.vehicleNumber,
        vehicleType: submission.vehicleType,
        driverName: submission.driverName,
        driverMobile: submission.driverMobile,
        driverDob: submission.driverDob,
        companyName: submission.companyName,
        addressTaluka: submission.addressTaluka,
        addressDistrict: submission.addressDistrict,
        addressState: submission.addressState,
        addressPincode: submission.addressPincode,
        aadhaarNumber: submission.aadhaarNumber,
        licenseNumber: submission.licenseNumber,
      },
      submission.extractions
    );

    return NextResponse.json({ submission, reconciliation });
  } catch (error: any) {
    console.error("Get submission error:", error);
    return NextResponse.json({ error: "Failed to fetch submission." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    // Only creator or admin can delete draft submissions
    if (user.role !== "ADMIN" && submission.createdById !== user.userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    if (submission.status === "APPROVED" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Cannot delete approved submissions." },
        { status: 400 }
      );
    }

    await prisma.submission.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Submission deleted." });
  } catch (error: any) {
    console.error("Delete submission error:", error);
    return NextResponse.json({ error: "Failed to delete submission." }, { status: 500 });
  }
}
