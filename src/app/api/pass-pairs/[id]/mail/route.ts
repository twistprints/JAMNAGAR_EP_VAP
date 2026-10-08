import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/pass-pairs/[id]/mail - Mark pass pair as mailed or not mailed
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can change mailed status" }, { status: 403 });
    }

    const submissionId = params.id;
    const body = await req.json().catch(() => ({}));
    const shouldMarkMailed = body.mailed !== false; // default true unless explicitly false

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return NextResponse.json({ error: "Pass pair record not found" }, { status: 404 });
    }

    if (shouldMarkMailed && submission.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Cannot mark as mailed: Both EP and VAP must be APPROVED first." },
        { status: 400 }
      );
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        mailed: shouldMarkMailed,
        mailedAt: shouldMarkMailed ? new Date() : null,
        mailedById: shouldMarkMailed ? user.userId : null,
        mailedByName: shouldMarkMailed ? user.name : null,
      },
    });

    await logAudit({
      userId: user.userId,
      userName: user.name,
      action: shouldMarkMailed ? "MARKED_AS_MAILED" : "MARKED_AS_NOT_MAILED",
      resourceType: "SUBMISSION",
      resourceId: submission.id,
      details: shouldMarkMailed
        ? `Marked pass pair ${submission.passPairId || submission.submissionNo} as MAILED`
        : `Unmarked pass pair ${submission.passPairId || submission.submissionNo} as NOT MAILED`,
    });

    return NextResponse.json({
      success: true,
      record: {
        id: updated.id,
        mailed: updated.mailed,
        mailedAt: updated.mailedAt,
        mailedByName: updated.mailedByName,
      },
    });
  } catch (error: any) {
    console.error("Error updating mailed status:", error);
    return NextResponse.json({ error: "Failed to update mailed status" }, { status: 500 });
  }
}
