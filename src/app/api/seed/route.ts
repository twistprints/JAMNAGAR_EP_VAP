import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { message: "Demo seeding is disabled for the production environment." },
    { status: 403 }
  );
}
