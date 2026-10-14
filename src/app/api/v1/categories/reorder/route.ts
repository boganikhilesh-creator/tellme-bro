import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { ROLES } from '@/lib/constants';
import { hasRole } from '@/lib/auth/rbac';
import { logAuditEvent } from '@/lib/services/audit.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || !hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN])) {
      return errorResponse('Forbidden: Admin access required', 403, 'FORBIDDEN');
    }

    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse('Items array with id and displayOrder is required', 400);
    }

    await prisma.$transaction(
      items.map((item: { id: string; displayOrder: number }) =>
        prisma.category.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        })
      )
    );

    await logAuditEvent({
      actorId: session.id,
      action: 'CATEGORIES_REORDERED',
      entityType: 'CATEGORY',
      details: { count: items.length },
    });

    return successResponse({ message: 'Categories reordered successfully' });
  } catch (error: any) {
    console.error('Reorder categories error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
