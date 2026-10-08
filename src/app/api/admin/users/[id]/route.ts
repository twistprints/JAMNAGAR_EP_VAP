import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, requireAdminResponse, requireAuthResponse } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/users/[id] - Activate/Deactivate user, Reset password via Supabase Auth, or edit profile
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
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const updateData: any = {};
    let auditAction = "UPDATE_USER";
    let auditDetails = `Updated user ${targetUser.username}`;
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Handle Active Status Toggle
    if (typeof active === "boolean") {
      updateData.active = active;
      auditAction = active ? "ENABLE_USER" : "DISABLE_USER";
      auditDetails = `${active ? "Activated" : "Deactivated"} user ${targetUser.username} (${targetUser.name})`;

      // Update Supabase Auth ban status
      if (supabaseAdmin && targetUser.authUserId) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(targetUser.authUserId, {
            ban_duration: active ? "none" : "876000h",
          });
        } catch (sbErr: any) {
          console.warn("Supabase Auth ban update notice:", sbErr?.message);
        }
      }
    }

    // 2. Handle Password Reset in Supabase Auth
    if (password && password.trim().length >= 6) {
      auditAction = "PASSWORD_RESET";
      auditDetails = `Reset password for user ${targetUser.username} (${targetUser.name}) in Supabase Auth`;

      if (supabaseAdmin && targetUser.authUserId) {
        try {
          const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(
            targetUser.authUserId,
            { password: password.trim() }
          );

          if (resetErr) {
            console.error("Supabase Auth password reset error:", resetErr.message);
            return NextResponse.json(
              { error: `Supabase Auth password update failed: ${resetErr.message}` },
              { status: 400 }
            );
          }
        } catch (sbErr: any) {
          console.error("Supabase Auth password update exception:", sbErr);
          return NextResponse.json(
            { error: `Failed to update password in Supabase Auth: ${sbErr?.message}` },
            { status: 500 }
          );
        }
      } else if (!targetUser.authUserId) {
        // If user doesn't have an authUserId, try to find or create them in Supabase Auth
        if (supabaseAdmin && targetUser.email) {
          try {
            const { data: created, error: crErr } = await supabaseAdmin.auth.admin.createUser({
              email: targetUser.email,
              password: password.trim(),
              email_confirm: true,
              user_metadata: {
                name: targetUser.name,
                role: targetUser.role,
                username: targetUser.username,
              },
            });

            if (!crErr && created.user) {
              updateData.authUserId = created.user.id;
            }
          } catch (_) {}
        }
      }
    }

    // 3. Handle Name & Phone updates
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
    return NextResponse.json({ error: error?.message || "Failed to update user." }, { status: 500 });
  }
}
