import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createSessionToken, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { supabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, email, loginId, identifier: rawId, password } = body;

    const identifier = (rawId || loginId || email || username || "").trim().toLowerCase();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Login ID / Email and password are required." },
        { status: 400 }
      );
    }

    // 1. Look up user profile in database
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid Login ID or password." },
        { status: 401 }
      );
    }

    // 2. Check if account is active
    if (!user.active) {
      return NextResponse.json(
        { error: "Your account has been deactivated. Please contact an administrator." },
        { status: 403 }
      );
    }

    // 3. Authenticate password
    let passwordValid = false;

    // Check against Supabase Auth if user has authUserId or email
    if (supabaseClient && user.email) {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
          email: user.email,
          password: password,
        });

        if (!authError && authData.user) {
          passwordValid = true;
          // Synchronize authUserId if not set
          if (!user.authUserId) {
            await prisma.user.update({
              where: { id: user.id },
              data: { authUserId: authData.user.id },
            });
          }
        }
      } catch (sbErr) {
        // Fall back to local hash if Supabase network is unreachable
      }
    }

    // Fall back to database hash verification
    if (!passwordValid && user.passwordHash) {
      passwordValid = await verifyPassword(password, user.passwordHash);
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid Login ID or password." },
        { status: 401 }
      );
    }

    // 4. Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 5. Create secure session token
    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role as "ADMIN" | "FIELD_USER",
      name: user.name,
      email: user.email,
      authUserId: user.authUserId,
    });

    // 6. Record Audit Log
    await logAudit({
      userId: user.id,
      userName: user.name,
      action: "LOGIN",
      resourceType: "USER",
      resourceId: user.id,
      details: `User ${user.name} (${user.role}) logged in successfully.`,
      ipAddress: req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1",
    });

    const isHttps = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        active: user.active,
      },
      redirectTo: user.role === "ADMIN" ? "/admin" : "/field",
    });

    // 7. Set secure HTTP-only cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during authentication." },
      { status: 500 }
    );
  }
}
