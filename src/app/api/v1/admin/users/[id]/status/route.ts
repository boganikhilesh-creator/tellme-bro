import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { ROLES } from '@/lib/constants';
import { hasRole } from '@/lib/auth/rbac';
import { logAuditEvent } from '@/lib/services/audit.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || !hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN])) {
      return errorResponse('Forbidden', 403, 'FORBIDDEN');
    }

    const resolvedParams = await params;
    const targetUserId = resolvedParams.id;
    const body = await req.json();
    const isActive = Boolean(body.isActive);

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!targetUser) {
      return errorResponse('User not found', 404, 'NOT_FOUND');
    }

    // Super Admin cannot be deactivated
    if (targetUser.role === ROLES.SUPER_ADMIN) {
      return errorResponse('The Super Administrator cannot be deactivated', 403, 'FORBIDDEN');
    }

    // Admin cannot deactivate other Admins
    if (session.role === ROLES.ADMIN && targetUser.role === ROLES.ADMIN) {
      return errorResponse('Admins cannot modify other Admins', 403, 'FORBIDDEN');
    }

    // Update status
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    // If deactivating, revoke all user's refresh tokens immediately
    if (!isActive) {
      await prisma.refreshToken.updateMany({
        where: { userId: targetUserId },
        data: { revoked: true },
      });
    }

    await logAuditEvent({
      actorId: session.id,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: targetUserId,
      details: { targetEmail: targetUser.email, newStatus: isActive },
    });

    return successResponse({
      message: `User ${targetUser.name} is now ${isActive ? 'active' : 'deactivated'}`,
      user: updated,
    });
  } catch (error: any) {
    console.error('Status update error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
