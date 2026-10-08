import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/batches - List all batches with real-time statistics
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batches = await prisma.batch.findMany({
      orderBy: { batchNumber: "desc" },
      include: {
        submissions: {
          select: {
            id: true,
            status: true,
            mailed: true,
          },
        },
      },
    });

    const batchData = batches.map((b) => {
      const total = b.submissions.length;
      const approved = b.submissions.filter((s) => s.status === "APPROVED").length;
      const pending = b.submissions.filter((s) => s.status !== "APPROVED" && s.status !== "REJECTED").length;
      const rejected = b.submissions.filter((s) => s.status === "REJECTED").length;
      const mailed = b.submissions.filter((s) => s.mailed).length;

      return {
        id: b.id,
        batchNumber: b.batchNumber,
        eventName: b.eventName,
        eventDate: b.eventDate,
        status: b.status,
        recordCount: total,
        approvedCount: approved,
        pendingCount: pending,
        rejectedCount: rejected,
        mailedCount: mailed,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      };
    });

    return NextResponse.json({ success: true, batches: batchData });
  } catch (error: any) {
    console.error("Error fetching batches:", error);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}

/**
 * POST /api/batches - Create a new batch with automatic auto-incrementing BATCH-XXX number
 */
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const eventName = body.eventName || "Jamnagar Reliance Green Event";
    const eventDate = body.eventDate || new Date().toISOString().split("T")[0];

    // Find highest batch number to auto-increment
    const existingBatches = await prisma.batch.findMany({
      select: { batchNumber: true },
    });

    let maxNum = 0;
    for (const b of existingBatches) {
      const match = b.batchNumber.match(/BATCH-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    const nextBatchNum = `BATCH-${String(maxNum + 1).padStart(3, "0")}`;

    const newBatch = await prisma.batch.create({
      data: {
        batchNumber: nextBatchNum,
        eventName,
        eventDate,
        createdById: user.userId,
        status: "ACTIVE",
        recordCount: 0,
      },
    });

    await logAudit({
      userId: user.userId,
      userName: user.name,
      action: "CREATE_BATCH",
      resourceType: "BATCH",
      resourceId: newBatch.id,
      details: `Created new batch ${nextBatchNum} for ${eventName}`,
    });

    return NextResponse.json({ success: true, batch: newBatch });
  } catch (error: any) {
    console.error("Error creating batch:", error);
    return NextResponse.json({ error: "Failed to create batch" }, { status: 500 });
  }
}
