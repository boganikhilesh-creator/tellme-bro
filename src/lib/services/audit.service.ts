import { prisma } from '../db';

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any> | string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditEvent(params: CreateAuditLogParams) {
  try {
    const detailsString =
      typeof params.details === 'object' && params.details !== null
        ? JSON.stringify(params.details)
        : params.details || null;

    return await prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        action: params.action,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        details: detailsString,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
    // Audit log failure shouldn't crash the main transaction, but is reported
    return null;
  }
}
