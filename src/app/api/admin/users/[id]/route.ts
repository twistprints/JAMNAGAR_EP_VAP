import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hashPassword, requireAdminResponse, requireAuthResponse } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/users/[id] - Activate/Deactivate user, Reset password, or edit user profile
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();
    if (user.role !== "ADMIN") return requireAdminResponse();

    const targetUserId = params.id;
    const body = await req.json().catch(() => ({}));
    const { active, password, name, phone } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {};
    let auditAction = "UPDATE_USER";
    let auditDetails = `Updated user ${targetUser.username}`;

    // Handle Active Status Toggle
    if (typeof active === "boolean") {
      updateData.active = active;
      auditAction = active ? "ENABLE_USER" : "DISABLE_USER";
      auditDetails = `${active ? "Activated" : "Deactivated"} user ${targetUser.username} (${targetUser.name})`;

      // Update Supabase Auth ban status if configured
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin && targetUser.authUserId) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(targetUser.authUserId, {
            ban_duration: active ? "none" : "876000h",
          });
        } catch (sbErr) {
          console.warn("Supabase Auth ban update notice:", sbErr);
        }
      }
    }

    // Handle Password Reset
    if (password && password.trim().length >= 6) {
      updateData.passwordHash = await hashPassword(password.trim());
      auditAction = "PASSWORD_RESET";
      auditDetails = `Reset password for user ${targetUser.username} (${targetUser.name})`;

      // Update Supabase Auth password if configured
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin && targetUser.authUserId) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(targetUser.authUserId, {
            password: password.trim(),
          });
        } catch (sbErr) {
          console.warn("Supabase Auth password reset notice:", sbErr);
        }
      }
    }

    // Handle Name & Phone updates
    if (name && name.trim()) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
    });

    await logAudit({
      userId: user.userId,
      userName: user.name,
      action: auditAction,
      resourceType: "USER",
      resourceId: targetUser.id,
      details: auditDetails,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        active: updatedUser.active,
        lastLoginAt: updatedUser.lastLoginAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}
