import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await authenticateRequest(req);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      active: true,
    },
  });

  if (!user || !user.active) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user });
}
