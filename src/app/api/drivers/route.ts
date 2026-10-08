import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { mobile: { contains: search } },
        { licenseNumber: { contains: search } },
        { aadhaarNumber: { contains: search } },
      ];
    }

    const drivers = await prisma.driver.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        submissions: {
          select: {
            id: true,
            submissionNo: true,
            vehicleNumber: true,
            companyName: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    });

    return NextResponse.json({ drivers, count: drivers.length });
  } catch (error: any) {
    console.error("Drivers fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch drivers." }, { status: 500 });
  }
}
