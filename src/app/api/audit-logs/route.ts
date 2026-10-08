import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAdminResponse, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();
    if (user.role !== "ADMIN") return requireAdminResponse();

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, username: true, role: true } },
      },
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error("Audit log error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs." }, { status: 500 });
  }
}
