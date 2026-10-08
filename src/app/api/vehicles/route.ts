import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeVehicleNo } from "@/lib/storage";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const where: any = {};
    if (search) {
      const norm = normalizeVehicleNo(search);
      where.OR = [
        { vehicleNumber: { contains: search } },
        { normalizedVehicleNumber: { contains: norm } },
        { manufacturer: { contains: search } },
        { model: { contains: search } },
      ];
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        submissions: {
          select: {
            id: true,
            submissionNo: true,
            driverName: true,
            companyName: true,
            status: true,
            createdAt: true,
            approvedAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json({ vehicles, count: vehicles.length });
  } catch (error: any) {
    console.error("Vehicles fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch vehicles." }, { status: 500 });
  }
}
