import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const where: any = {};
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { vendorRepresentative: { contains: search } },
        { representativeMobile: { contains: search } },
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ vendors, count: vendors.length });
  } catch (error: any) {
    console.error("Vendors fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch vendors." }, { status: 500 });
  }
}
