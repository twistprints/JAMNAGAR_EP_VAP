import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hashPassword, requireAdminResponse, requireAuthResponse } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users - List all users with profile and audit details (Admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();
    if (user.role !== "ADMIN") return requireAdminResponse();

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        authUserId: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdSubmissions: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      users: users.map((u) => ({
        ...u,
        submissionCount: u._count.createdSubmissions,
      })),
    });
  } catch (error: any) {
    console.error("Error listing users:", error);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

/**
 * POST /api/admin/users - Create a new Field User (Admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();
    if (user.role !== "ADMIN") return requireAdminResponse();

    const body = await req.json().catch(() => ({}));
    const { name, username, email, phone, password, role, active } = body;

    if (!name || !password || (!username && !email)) {
      return NextResponse.json(
        { error: "Name, Login ID / Email, and Password are required." },
        { status: 400 }
      );
    }

    const cleanUsername = (username || email.split("@")[0]).trim().toLowerCase();
    const cleanEmail = (email || `${cleanUsername}@jamnagar.gov.in`).trim().toLowerCase();

    // Enforce role rule: Admin can only create FIELD_USER accounts through this interface
    const assignedRole = role === "ADMIN" ? "FIELD_USER" : (role || "FIELD_USER");

    // Check for existing user
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          { email: cleanEmail },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A user with this Username or Email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    let authUserId: string | null = null;

    // Create user in Supabase Auth via Admin Service Role if configured
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      try {
        const { data: sbData, error: sbError } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            name: name.trim(),
            role: assignedRole,
            username: cleanUsername,
          },
        });

        if (!sbError && sbData.user) {
          authUserId = sbData.user.id;
        } else if (sbError) {
          console.warn("Supabase Auth admin createUser notice:", sbError.message);
        }
      } catch (sbEx) {
        console.warn("Supabase Auth admin exception:", sbEx);
      }
    }

    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        name: name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : null,
        passwordHash,
        authUserId,
        role: assignedRole,
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    await logAudit({
      userId: user.userId,
      userName: user.name,
      action: "CREATE_USER",
      resourceType: "USER",
      resourceId: newUser.id,
      details: `Created new ${assignedRole} account for ${newUser.name} (${newUser.username})`,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        active: newUser.active,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }
}
