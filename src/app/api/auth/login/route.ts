import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createSessionToken, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { supabaseClient } from "@/lib/supabase";

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

    // 1. Look up user profile in database with auto-bootstrap fallback
    let user = null;
    try {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: identifier },
            { email: identifier },
          ],
        },
      });
    } catch (dbError: any) {
      console.warn("Initial DB lookup notice:", dbError?.message);
    }

    // Auto-bootstrap master admin / field user if database is unseeded or missing this account
    if (!user) {
      try {
        const bcrypt = require("bcryptjs");

        if (identifier === "saketdeva" || identifier === "saketdeva@jamnagar.gov.in" || identifier === "admin") {
          const passHash = await bcrypt.hash("8180922746@lucifer1927", 10);
          user = await prisma.user.create({
            data: {
              username: "saketdeva",
              email: "saketdeva@jamnagar.gov.in",
              name: "Saket Deva",
              passwordHash: passHash,
              role: "ADMIN",
              active: true,
            },
          });
          console.log("✓ Auto-bootstrapped master administrator account (Saketdeva)");
        } else if (identifier === "field" || identifier === "field@jamnagar.gov.in") {
          const passHash = await bcrypt.hash("field123", 10);
          user = await prisma.user.create({
            data: {
              username: "field",
              email: "field@jamnagar.gov.in",
              name: "Jamnagar Field Verification Officer",
              passwordHash: passHash,
              role: "FIELD_USER",
              active: true,
            },
          });
          console.log("✓ Auto-bootstrapped default field user account (field)");
        }
      } catch (seedErr: any) {
        console.warn("Auto-bootstrap notice:", seedErr?.message);
      }
    }

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

    // 3. Portal-specific role enforcement
    if (targetPortal === "ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. This login is for administrators only." },
        { status: 403 }
      );
    }

    if (targetPortal === "FIELD_USER" && user.role !== "FIELD_USER") {
      return NextResponse.json(
        { error: "This login is for authorized field users." },
        { status: 403 }
      );
    }

    // 4. Authenticate password
    let passwordValid = false;

    // Check against Supabase Auth if user has email
    if (supabaseClient && user.email) {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
          email: user.email,
          password: password,
        });

        if (!authError && authData.user) {
          passwordValid = true;
          if (!user.authUserId) {
            try {
              await prisma.user.update({
                where: { id: user.id },
                data: { authUserId: authData.user.id },
              });
            } catch (uErr) {}
          }
        }
      } catch (sbErr) {}
    }

    // Fall back to database hash verification
    if (!passwordValid && user.passwordHash) {
      passwordValid = await verifyPassword(password, user.passwordHash);
    }

    // Direct password match fallback for bootstrap credentials
    if (!passwordValid) {
      if (
        (user.username === "saketdeva" || user.email === "saketdeva@jamnagar.gov.in") &&
        password === "8180922746@lucifer1927"
      ) {
        passwordValid = true;
      } else if (
        (user.username === "field" || user.email === "field@jamnagar.gov.in") &&
        password === "field123"
      ) {
        passwordValid = true;
      }
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid Login ID or password." },
        { status: 401 }
      );
    }

    // 5. Update last login timestamp (safe)
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch (llErr) {}

    // 6. Create secure session token
    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role as "ADMIN" | "FIELD_USER",
      name: user.name,
      email: user.email,
      authUserId: user.authUserId,
    });

    // 7. Record Audit Log (safe)
    try {
      await logAudit({
        userId: user.id,
        userName: user.name,
        action: "LOGIN",
        resourceType: "USER",
        resourceId: user.id,
        details: `User ${user.name} (${user.role}) logged in successfully.`,
        ipAddress: req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1",
      });
    } catch (audErr) {}

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

    // 8. Set secure HTTP-only cookie
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
      { error: error?.message || "An error occurred during authentication." },
      { status: 500 }
    );
  }
}
