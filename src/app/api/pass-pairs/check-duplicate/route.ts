import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/pass-pairs/check-duplicate - Check if a pass pair duplicate exists
 */
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      aadhaarNumber,
      licenseNumber,
      vehicleNumber,
      driverMobile,
      driverName,
      excludeSubmissionId,
    } = body;

    const conditions: any[] = [];

    const cleanAadhaar = aadhaarNumber ? aadhaarNumber.replace(/\s+/g, "") : "";
    if (cleanAadhaar && cleanAadhaar.length >= 8) {
      conditions.push({ aadhaarNumber: { contains: cleanAadhaar } });
    }

    const cleanLic = licenseNumber ? licenseNumber.replace(/\s+/g, "").toUpperCase() : "";
    if (cleanLic && cleanLic.length >= 6) {
      conditions.push({ licenseNumber: { contains: cleanLic } });
    }

    const cleanVeh = vehicleNumber ? vehicleNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : "";
    if (cleanVeh && cleanVeh.length >= 5) {
      conditions.push({ normalizedVehicleNo: { contains: cleanVeh } });
    }

    const cleanMob = driverMobile ? driverMobile.replace(/\s+/g, "") : "";
    if (cleanMob && cleanMob.length >= 10) {
      conditions.push({ driverMobile: { contains: cleanMob } });
    }

    if (driverName && vehicleNumber) {
      conditions.push({
        AND: [
          { driverName: { contains: driverName.trim() } },
          { normalizedVehicleNo: { contains: cleanVeh } },
        ],
      });
    }

    if (conditions.length === 0) {
      return NextResponse.json({ isDuplicate: false, matches: [] });
    }

    const whereClause: any = {
      OR: conditions,
    };

    if (excludeSubmissionId) {
      whereClause.id = { not: excludeSubmissionId };
    }

    const matchedRecords = await prisma.submission.findMany({
      where: whereClause,
      include: {
        batch: true,
      },
      take: 5,
    });

    if (matchedRecords.length > 0) {
      return NextResponse.json({
        isDuplicate: true,
        message: "POSSIBLE EXISTING PASS FOUND",
        matches: matchedRecords.map((m) => ({
          id: m.id,
          submissionNo: m.submissionNo,
          passPairId: m.passPairId || `PASS-${String(m.globalSequence || 1).padStart(6, "0")}`,
          batchNumber: m.batch?.batchNumber || "BATCH-001",
          driverName: m.driverName,
          vehicleNumber: m.vehicleNumber,
          driverMobile: m.driverMobile,
          aadhaarNumber: m.aadhaarNumber,
          licenseNumber: m.licenseNumber,
          status: m.status,
          createdAt: m.createdAt,
        })),
      });
    }

    return NextResponse.json({ isDuplicate: false, matches: [] });
  } catch (error: any) {
    console.error("Duplicate check error:", error);
    return NextResponse.json({ error: "Duplicate check failed" }, { status: 500 });
  }
}
