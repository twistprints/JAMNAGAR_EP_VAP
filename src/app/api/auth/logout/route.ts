import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, authenticateRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { supabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (user) {
      await logAudit({
        userId: user.userId,
        userName: user.name,
        action: "LOGOUT",
        resourceType: "USER",
        resourceId: user.userId,
        details: `User ${user.name} logged out.`,
      });
    }

    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch (e) {
        // ignore
      }
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully." });
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: "",
      maxAge: 0,
      path: "/",
      httpOnly: true,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: true });
  }
}
