import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { ROLES, POST_STATUS } from '@/lib/constants';
import { hasRole } from '@/lib/auth/rbac';
import { logAuditEvent } from '@/lib/services/audit.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || !hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR])) {
      return errorResponse('Forbidden: Staff role required', 403, 'FORBIDDEN');
    }

    const { id } = await context.params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: { categories: true },
    });

    if (!post || post.deletedAt) {
      return errorResponse('Post not found', 404);
    }

    const isAdmin = hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    const isOwner = session.id === post.createdById;

    if (!isAdmin && !isOwner) {
      return errorResponse('Forbidden: You can only submit your own posts', 403, 'FORBIDDEN');
    }

    if (post.status === POST_STATUS.PUBLISHED) {
      return errorResponse('Post is already published', 400);
    }

    if (post.categories.length === 0) {
      return errorResponse('Post must have at least one category before submitting', 400);
    }

    const updated = await prisma.post.update({
      where: { id },
      data: { status: POST_STATUS.PENDING },
    });

    await logAuditEvent({
      actorId: session.id,
      action: 'POST_SUBMITTED_FOR_REVIEW',
      entityType: 'POST',
      entityId: id,
      details: { previousStatus: post.status },
    });

    return successResponse({
      message: 'Post submitted for admin review successfully',
      post: updated,
    });
  } catch (error: any) {
    console.error('Submit post error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
