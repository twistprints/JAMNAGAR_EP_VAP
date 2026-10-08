import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAuthResponse } from "@/lib/auth";
import { verifyGeminiConnection } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();

    const result = await verifyGeminiConnection();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Gemini status check error:", error);
    return NextResponse.json({
      configured: false,
      success: false,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      message: error?.message || "Failed to test Gemini connectivity.",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
