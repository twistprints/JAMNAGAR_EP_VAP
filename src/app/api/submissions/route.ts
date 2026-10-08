import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { normalizeVehicleNo } from "@/lib/storage";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const search = searchParams.get("search");
    const date = searchParams.get("date");
    const onlyMine = searchParams.get("onlyMine") === "true";

    const where: any = {};

    // Role-based restrictions: Field users only see their own drafts/submissions if requested
    if (user.role === "FIELD_USER" || onlyMine) {
      where.createdById = user.userId;
    }

    if (status && status !== "ALL") {
      if (status === "PENDING") {
        where.status = { in: ["SUBMITTED", "ADMIN_REVIEW", "READY_FOR_FIELD_VERIFICATION"] };
      } else if (status === "INCOMPLETE") {
        where.status = { in: ["DRAFT", "DOCUMENTS_PENDING"] };
      } else {
        where.status = status;
      }
    }

    if (source && source !== "ALL") {
      where.sourceType = source;
    }

    if (search) {
      const cleanSearch = search.trim();
      where.OR = [
        { vehicleNumber: { contains: cleanSearch } },
        { normalizedVehicleNo: { contains: normalizeVehicleNo(cleanSearch) } },
        { driverName: { contains: cleanSearch } },
        { companyName: { contains: cleanSearch } },
        { submissionNo: { contains: cleanSearch } },
        { driverMobile: { contains: cleanSearch } },
      ];
    }

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const submissions = await prisma.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true, username: true } },
        approvedBy: { select: { id: true, name: true } },
        documents: {
          select: {
            id: true,
            category: true,
            fileName: true,
            fileSize: true,
            pageNumber: true,
            uploadedAt: true,
          },
        },
        extractions: {
          select: {
            id: true,
            category: true,
            confidenceScore: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({ submissions, count: submissions.length });
  } catch (error: any) {
    console.error("Fetch submissions error:", error);
    return NextResponse.json({ error: "Failed to fetch submissions." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();

    const body = await req.json();
    const {
      id,
      vehicleNumber,
      vehicleType,
      driverName,
      driverMobile,
      driverDob,
      companyName,
      designation,
      vendorRepresentative,
      vendorRepMobile,
      addressTaluka,
      addressDistrict,
      addressState,
      addressPincode,
      areaOfWork,
      validityRequired,
      remarks,
      sourceType,
      currentStep,
    } = body;

    if (!vehicleNumber || !driverName || !companyName) {
      return NextResponse.json(
        { error: "Vehicle Number, Driver Name, and Company Name are required." },
        { status: 400 }
      );
    }

    const normVehicleNo = normalizeVehicleNo(vehicleNumber);

    // Auto-upsert or find Vendor
    let vendor = await prisma.vendor.findUnique({
      where: { companyName: companyName.trim() },
    });
    if (!vendor && companyName) {
      vendor = await prisma.vendor.create({
        data: {
          companyName: companyName.trim(),
          vendorRepresentative: vendorRepresentative?.trim() || null,
          representativeMobile: vendorRepMobile?.trim() || null,
        },
      });
    }

    // Auto-upsert or find Vehicle
    let vehicle = await prisma.vehicle.findUnique({
      where: { normalizedVehicleNumber: normVehicleNo },
    });
    if (!vehicle && normVehicleNo) {
      vehicle = await prisma.vehicle.create({
        data: {
          vehicleNumber: vehicleNumber.trim(),
          normalizedVehicleNumber: normVehicleNo,
          vehicleType: vehicleType || "Truck",
        },
      });
    }

    // Generate unique sequential submission number if creating new
    let submissionNo = "";
    if (!id) {
      const year = new Date().getFullYear();
      const count = await prisma.submission.count();
      const seq = 1000 + count + 1;
      submissionNo = `JAM-${year}-${seq}`;
    }

    let submission;

    if (id) {
      // Update existing draft
      submission = await prisma.submission.update({
        where: { id },
        data: {
          vehicleNumber: vehicleNumber.trim(),
          normalizedVehicleNo: normVehicleNo,
          vehicleType: vehicleType || "Truck",
          driverName: driverName.trim(),
          driverMobile: driverMobile?.trim() || null,
          driverDob: driverDob?.trim() || null,
          companyName: companyName.trim(),
          designation: designation || "Driver",
          vendorRepresentative: vendorRepresentative?.trim() || null,
          vendorRepMobile: vendorRepMobile?.trim() || null,
          addressTaluka: addressTaluka?.trim() || null,
          addressDistrict: addressDistrict?.trim() || null,
          addressState: addressState?.trim() || "Gujarat",
          addressPincode: addressPincode?.trim() || null,
          areaOfWork: areaOfWork || "RG",
          validityRequired: validityRequired?.trim() || "1 Month",
          remarks: remarks?.trim() || null,
          currentStep: currentStep || 2,
          lastModifiedById: user.userId,
          vehicleId: vehicle?.id,
          vendorId: vendor?.id,
        },
        include: {
          documents: true,
          extractions: true,
        },
      });

      await recordAuditLog({
        userId: user.userId,
        userName: user.name,
        action: "UPDATE_DRAFT",
        resourceType: "SUBMISSION",
        resourceId: submission.id,
        details: { vehicleNumber, driverName, currentStep },
      });
    } else {
      // Create fresh submission/draft
      const initialStatus = sourceType === "SOURCE_WHATSAPP" || sourceType === "SOURCE_MANUAL"
        ? "ADMIN_REVIEW"
        : "DRAFT";

      submission = await prisma.submission.create({
        data: {
          submissionNo,
          sourceType: sourceType || (user.role === "ADMIN" ? "SOURCE_MANUAL" : "SOURCE_APP"),
          status: initialStatus,
          currentStep: currentStep || 1,
          createdById: user.userId,
          vehicleNumber: vehicleNumber.trim(),
          normalizedVehicleNo: normVehicleNo,
          vehicleType: vehicleType || "Truck",
          driverName: driverName.trim(),
          driverMobile: driverMobile?.trim() || null,
          driverDob: driverDob?.trim() || null,
          companyName: companyName.trim(),
          designation: designation || "Driver",
          vendorRepresentative: vendorRepresentative?.trim() || null,
          vendorRepMobile: vendorRepMobile?.trim() || null,
          addressTaluka: addressTaluka?.trim() || null,
          addressDistrict: addressDistrict?.trim() || null,
          addressState: addressState?.trim() || "Gujarat",
          addressPincode: addressPincode?.trim() || null,
          areaOfWork: areaOfWork || "RG",
          validityRequired: validityRequired?.trim() || "1 Month",
          remarks: remarks?.trim() || null,
          vehicleId: vehicle?.id,
          vendorId: vendor?.id,
        },
        include: {
          documents: true,
          extractions: true,
        },
      });

      await recordAuditLog({
        userId: user.userId,
        userName: user.name,
        action: "CREATE_SUBMISSION",
        resourceType: "SUBMISSION",
        resourceId: submission.id,
        details: { submissionNo, vehicleNumber, sourceType: submission.sourceType },
      });
    }

    return NextResponse.json({ success: true, submission });
  } catch (error: any) {
    console.error("Save submission error:", error);
    return NextResponse.json({ error: error?.message || "Failed to save submission." }, { status: 500 });
  }
}
