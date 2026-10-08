import { prisma } from "./prisma";

export interface AuditLogParams {
  userId?: string | null;
  userName?: string | null;
  action: string;
  resourceType?: string;
  entityType?: string;
  resourceId?: string | null;
  entityId?: string | null;
  details?: Record<string, any> | string | null;
  metadata?: Record<string, any> | string | null;
  ipAddress?: string | null;
}

/**
 * Server-safe audit logging utility for Supabase / SQLite audit_logs table
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const resourceType = params.resourceType || params.entityType || "SYSTEM";
    const resourceId = params.resourceId || params.entityId || null;
    const rawDetails = params.details !== undefined ? params.details : params.metadata;
    const detailsStr =
      rawDetails !== undefined && rawDetails !== null
        ? typeof rawDetails === "object"
          ? JSON.stringify(rawDetails)
          : String(rawDetails)
        : "";

    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        userName: params.userName || "System",
        action: params.action,
        resourceType,
        resourceId,
        details: detailsStr,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("[AUDIT LOGGING NOTICE] Failed to write audit log:", error);
  }
}

/**
 * Backward-compatible alias for recordAuditLog
 */
export async function recordAuditLog(params: AuditLogParams): Promise<void> {
  return logAudit(params);
}

export default logAudit;
