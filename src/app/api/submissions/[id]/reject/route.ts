import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAdminResponse, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();
    if (user.role !== "ADMIN") return requireAdminResponse();

    const { reason, returnToFieldUser } = await req.json();

    const newStatus = returnToFieldUser ? "ADMIN_CORRECTION_REQUIRED" : "REJECTED";

    const submission = await prisma.submission.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        rejectionReason: reason || "Document clarity or information correction required.",
        lastModifiedById: user.userId,
      },
    });

    await recordAuditLog({
      userId: user.userId,
      userName: user.name,
      action: returnToFieldUser ? "RETURN_FOR_CORRECTION" : "REJECT_SUBMISSION",
      resourceType: "SUBMISSION",
      resourceId: submission.id,
      details: { reason, newStatus },
    });

    return NextResponse.json({
      success: true,
      message: returnToFieldUser ? "Returned for field correction." : "Submission rejected.",
      submission,
    });
  } catch (error: any) {
    console.error("Reject error:", error);
    return NextResponse.json({ error: error?.message || "Failed to reject." }, { status: 500 });
  }
}
