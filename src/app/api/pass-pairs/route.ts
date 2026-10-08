import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/pass-pairs - Query Master Register pass pairs with extensive filtering and search
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const batchId = searchParams.get("batchId") || "";
    const statusFilter = searchParams.get("status") || "ALL"; // ALL, PENDING, APPROVED, MAILED, REJECTED
    const driverFilter = searchParams.get("driver")?.trim() || "";
    const vehicleFilter = searchParams.get("vehicle")?.trim() || "";

    const where: any = {};

    if (batchId && batchId !== "ALL") {
      where.batchId = batchId;
    }

    if (statusFilter === "MAILED") {
      where.mailed = true;
    } else if (statusFilter === "APPROVED") {
      where.status = "APPROVED";
      where.mailed = false;
    } else if (statusFilter === "PENDING") {
      where.status = { notIn: ["APPROVED", "REJECTED"] };
    } else if (statusFilter === "REJECTED") {
      where.status = "REJECTED";
    }

    if (search) {
      where.OR = [
        { driverName: { contains: search } },
        { vehicleNumber: { contains: search } },
        { passPairId: { contains: search } },
        { submissionNo: { contains: search } },
        { aadhaarNumber: { contains: search } },
        { companyName: { contains: search } },
      ];
    }

    if (driverFilter) {
      where.driverName = { contains: driverFilter };
    }

    if (vehicleFilter) {
      where.normalizedVehicleNo = { contains: vehicleFilter.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() };
    }

    const passPairs = await prisma.submission.findMany({
      where,
      orderBy: [
        { batchSequence: "asc" },
        { createdAt: "desc" },
      ],
      include: {
        batch: true,
        documents: {
          select: {
            id: true,
            category: true,
            fileName: true,
          },
        },
      },
    });

    // Compute KPI Counts
    const allRecords = await prisma.submission.findMany({
      select: {
        id: true,
        status: true,
        mailed: true,
      },
    });

    const totalCount = allRecords.length;
    const approvedCount = allRecords.filter((r) => r.status === "APPROVED" && !r.mailed).length;
    const mailedCount = allRecords.filter((r) => r.mailed).length;
    const pendingCount = allRecords.filter((r) => r.status !== "APPROVED" && r.status !== "REJECTED").length;
    const rejectedCount = allRecords.filter((r) => r.status === "REJECTED").length;

    const formattedRecords = passPairs.map((p, idx) => ({
      id: p.id,
      submissionNo: p.submissionNo,
      passPairId: p.passPairId || `PASS-${String(p.globalSequence || idx + 1).padStart(6, "0")}`,
      batchId: p.batchId,
      batchNumber: p.batch?.batchNumber || "BATCH-001",
      batchSequence: p.batchSequence || (idx + 1),
      globalSequence: p.globalSequence || (idx + 1),
      epName: p.driverName,
      company: p.companyName,
      designation: p.designation || "Driver",
      mobileNumber: p.driverMobile,
      vehicleNumber: p.vehicleNumber,
      vehicleType: p.vehicleType,
      vehicleModel: p.vehicleModel || p.vehicleType,
      modelYear: p.modelYear,
      driverName: p.driverName,
      driverMobile: p.driverMobile,
      aadhaarNumber: p.aadhaarNumber,
      licenseNumber: p.licenseNumber,
      vendor: p.companyName,
      epStatus: p.epStatus || (p.status === "APPROVED" ? "APPROVED" : "PENDING"),
      vapStatus: p.vapStatus || (p.status === "APPROVED" ? "APPROVED" : "PENDING"),
      overallStatus: p.status,
      mailed: p.mailed,
      mailedAt: p.mailedAt,
      mailedByName: p.mailedByName,
      createdAt: p.createdAt,
      approvedAt: p.approvedAt,
      remarks: p.remarks,
      hasPhoto: p.documents.some((d) => d.category === "DRIVER_PHOTO"),
    }));

    return NextResponse.json({
      success: true,
      records: formattedRecords,
      stats: {
        total: totalCount,
        approved: approvedCount,
        mailed: mailedCount,
        pending: pendingCount,
        rejected: rejectedCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching pass pairs:", error);
    return NextResponse.json({ error: "Failed to fetch pass pairs" }, { status: 500 });
  }
}
