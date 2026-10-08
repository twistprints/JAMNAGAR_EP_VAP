import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAdminResponse, requireAuthResponse } from "@/lib/auth";
import { getValidatedExportData } from "@/lib/exportService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();
    if (user.role !== "ADMIN") return requireAdminResponse();

    const searchParams = req.nextUrl.searchParams;
    const filter = (searchParams.get("filter") as "ALL" | "TODAY" | "DATE_RANGE" | "SELECTED") || "ALL";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const validation = await getValidatedExportData({
      filter,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      valid: validation.valid,
      errors: validation.errors,
      approvedCount: validation.approvedCount,
      recordsCount: validation.records.length,
      records: validation.records.map((r) => ({
        sequenceNumber: r.sequenceNumber,
        submissionNo: r.submissionNo,
        driverName: r.driverName,
        vehicleNumber: r.vehicleNumber,
        companyName: r.companyName,
        hasPhoto: !!(r.photoBuffer && r.photoBuffer.length > 0),
      })),
    });
  } catch (error: any) {
    console.error("Export validation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to validate export." },
      { status: 500 }
    );
  }
}
