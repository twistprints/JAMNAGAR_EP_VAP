import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAdminResponse, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();
    if (user.role !== "ADMIN") return requireAdminResponse();

    const batches = await prisma.exportBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true, username: true } },
      },
      take: 20,
    });

    return NextResponse.json({ batches });
  } catch (error: any) {
    console.error("Export history error:", error);
    return NextResponse.json({ error: "Failed to fetch export history." }, { status: 500 });
  }
}
