import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalSubmissions,
      pendingCount,
      approvedTodayCount,
      incompleteCount,
      manualWhatsappCount,
      totalVehicles,
      totalDrivers,
      totalVendors,
      mismatchSubmissionsCount,
    ] = await Promise.all([
      prisma.submission.count(),
      prisma.submission.count({
        where: { status: { in: ["SUBMITTED", "ADMIN_REVIEW", "READY_FOR_FIELD_VERIFICATION"] } },
      }),
      prisma.submission.count({
        where: {
          status: "APPROVED",
          approvedAt: { gte: startOfToday },
        },
      }),
      prisma.submission.count({
        where: { status: { in: ["DRAFT", "DOCUMENTS_PENDING"] } },
      }),
      prisma.submission.count({
        where: { sourceType: { in: ["SOURCE_MANUAL", "SOURCE_WHATSAPP"] } },
      }),
      prisma.vehicle.count(),
      prisma.driver.count(),
      prisma.vendor.count(),
      prisma.submission.count({
        where: { mismatchCount: { gt: 0 } },
      }),
    ]);

    return NextResponse.json({
      pending: pendingCount,
      approvedToday: approvedTodayCount,
      incomplete: incompleteCount,
      manualEntries: manualWhatsappCount,
      totalSubmissions,
      totalVehicles,
      totalDrivers,
      totalVendors,
      mismatches: mismatchSubmissionsCount,
    });
  } catch (error: any) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats." }, { status: 500 });
  }
}
