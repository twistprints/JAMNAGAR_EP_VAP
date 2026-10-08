import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { supabaseClient, getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, email, loginId, identifier: rawId, password, portalType, requiredRole } = body;

    const targetPortal = portalType || requiredRole;
    const identifier = (rawId || loginId || email || username || "").trim().toLowerCase();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Login ID / Email and password are required." },
        { status: 400 }
      );
    }

    if (!supabaseClient) {
      return NextResponse.json(
        { error: "Authentication service is not configured. Please contact administrator." },
        { status: 500 }
      );
    }

    // 1. Resolve email address from identifier (username or email)
    let userEmail = identifier;
    let dbUser = null;

    try {
      dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: identifier },
            { email: identifier },
          ],
        },
      });
    } catch (dbErr) {
      console.warn("Database lookup notice:", dbErr);
    }

    if (dbUser && dbUser.email) {
      userEmail = dbUser.email.toLowerCase();
    } else if (!userEmail.includes("@")) {
      userEmail = `${identifier}@jamnagar.gov.in`;
    }

    // 2. Pure Supabase Auth verification
    let authData: any = null;
    let authError: any = null;

    const authRes = await supabaseClient.auth.signInWithPassword({
      email: userEmail,
      password: password,
    });

    authData = authRes.data;
    authError = authRes.error;

    // If initial attempt with default domain fails and identifier was a username without @,
    // also attempt lookup in Supabase Auth via Admin client
    if (authError && !identifier.includes("@")) {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        try {
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const matchedUser = listData?.users?.find(
            (u) =>
              u.user_metadata?.username?.toLowerCase() === identifier ||
              u.email?.toLowerCase().startsWith(`${identifier}@`)
          );
          if (matchedUser && matchedUser.email) {
            const retryRes = await supabaseClient.auth.signInWithPassword({
              email: matchedUser.email,
              password: password,
            });
            if (!retryRes.error && retryRes.data?.session) {
              authData = retryRes.data;
              authError = null;
              userEmail = matchedUser.email;
            }
          }
        } catch (_) {}
      }
    }

    if (authError || !authData?.user || !authData?.session) {
      return NextResponse.json(
        { error: authError?.message || "Invalid Login ID or password." },
        { status: 401 }
      );
    }

    // 3. Fetch or self-heal authoritative database profile
    if (!dbUser) {
      try {
        dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { authUserId: authData.user.id },
              { email: userEmail },
              { email: authData.user.email?.toLowerCase() },
            ],
          },
        });
      } catch (_) {}
    }

    if (!dbUser) {
      // Self-heal: Create profile in DB using verified Supabase Auth user metadata
      const metaRole =
        (authData.user.user_metadata as any)?.role ||
        (authData.user.email?.toLowerCase().includes("admin") || authData.user.email?.toLowerCase().includes("saket")
          ? "ADMIN"
          : "FIELD_USER");
      const metaName =
        (authData.user.user_metadata as any)?.name ||
        authData.user.email?.split("@")[0] ||
        "User";
      const metaUsername =
        (authData.user.user_metadata as any)?.username ||
        authData.user.email?.split("@")[0] ||
        identifier;

      try {
        dbUser = await prisma.user.create({
          data: {
            authUserId: authData.user.id,
            email: authData.user.email?.toLowerCase() || userEmail,
            username: metaUsername.toLowerCase(),
            name: metaName,
            role: metaRole,
            active: true,
            passwordHash: "",
          },
        });
      } catch (crErr) {
        console.warn("Could not self-heal user profile in DB:", crErr);
      }
    }

    // Link authUserId if not set
    if (dbUser && !dbUser.authUserId) {
      try {
        dbUser = await prisma.user.update({
          where: { id: dbUser.id },
          data: { authUserId: authData.user.id },
        });
      } catch (_) {}
    }

    const effectiveRole = dbUser?.role || (authData.user.user_metadata?.role as string) || "FIELD_USER";
    const isActive = dbUser ? dbUser.active : true;

    // 4. Check if account is active
    if (!isActive) {
      return NextResponse.json(
        { error: "Your account has been deactivated. Please contact an administrator." },
        { status: 403 }
      );
    }

    // 5. Portal-specific role enforcement
    if (targetPortal === "ADMIN" && effectiveRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. This login is for administrators only." },
        { status: 403 }
      );
    }

    if (targetPortal === "FIELD_USER" && effectiveRole !== "FIELD_USER") {
      return NextResponse.json(
        { error: "This login is for authorized field users." },
        { status: 403 }
      );
    }

    // 6. Update last login timestamp
    if (dbUser) {
      try {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { lastLoginAt: new Date() },
        });
      } catch (_) {}
    }

    // 7. Record Audit Log
    try {
      await logAudit({
        userId: dbUser?.id || authData.user.id,
        userName: dbUser?.name || authData.user.email || "User",
        action: "LOGIN",
        resourceType: "USER",
        resourceId: dbUser?.id || authData.user.id,
        details: `User ${dbUser?.name || authData.user.email} (${effectiveRole}) logged in successfully.`,
        ipAddress: req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1",
      });
    } catch (_) {}

    const isHttps = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";

    const response = NextResponse.json({
      success: true,
      token: authData.session.access_token,
      user: {
        id: dbUser?.id || authData.user.id,
        username: dbUser?.username || identifier,
        name: dbUser?.name || authData.user.email,
        email: dbUser?.email || authData.user.email,
        role: effectiveRole,
        phone: dbUser?.phone || null,
        active: isActive,
      },
      redirectTo: effectiveRole === "ADMIN" ? "/admin" : "/field",
    });

    // 8. Set secure HTTP-only cookie with Supabase access token
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: authData.session.access_token,
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
      { error: error?.message || "An error occurred during authentication." },
      { status: 500 }
    );
  }
}
