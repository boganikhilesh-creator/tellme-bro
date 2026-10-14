import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { ROLES } from '@/lib/constants';
import { hasRole, canAssignRole } from '@/lib/auth/rbac';
import { logAuditEvent } from '@/lib/services/audit.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || !hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN])) {
      return errorResponse('Forbidden: Administrative privileges required', 403, 'FORBIDDEN');
    }

    const resolvedParams = await params;
    const targetUserId = resolvedParams.id;
    const body = await req.json();
    const newRole = body.role?.trim();

    if (!newRole || !Object.values(ROLES).includes(newRole as any)) {
      return errorResponse('Invalid role specified', 400, 'INVALID_ROLE');
    }

    // Fetch target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!targetUser) {
      return errorResponse('User not found', 404, 'NOT_FOUND');
    }

    // Evaluate RBAC rule
    const check = canAssignRole(session.role, targetUser.role, newRole);
    if (!check.allowed) {
      return errorResponse(check.reason || 'Permission denied', 403, 'FORBIDDEN');
    }

    // Update target user's role
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: { id: true, email: true, name: true, role: true },
    });

    // Write to audit log
    await logAuditEvent({
      actorId: session.id,
      action: 'USER_ROLE_CHANGED',
      entityType: 'USER',
      entityId: targetUserId,
      details: {
        targetEmail: targetUser.email,
        oldRole: targetUser.role,
        newRole,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    });

    return successResponse({
      message: `Role for ${targetUser.name} successfully updated to ${newRole}`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Role update error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
