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
    if (!session || !hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN])) {
      return errorResponse('Forbidden: Admin access required to reject posts', 403, 'FORBIDDEN');
    }

    const { id } = await context.params;
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post || post.deletedAt) {
      return errorResponse('Post not found', 404);
    }

    const body = await req.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return errorResponse('Rejection reason is required (at least 3 characters)', 400);
    }

    const [updatedPost, approval] = await prisma.$transaction([
      prisma.post.update({
        where: { id },
        data: { status: POST_STATUS.REJECTED },
      }),
      prisma.contentApproval.create({
        data: {
          postId: id,
          reviewerId: session.id,
          action: 'REJECTED',
          reason: reason.trim(),
        },
      }),
    ]);

    await logAuditEvent({
      actorId: session.id,
      action: 'POST_REJECTED',
      entityType: 'POST',
      entityId: id,
      details: { reason: reason.trim() },
    });

    return successResponse({
      message: 'Post rejected with feedback provided to editor',
      post: updatedPost,
      approval,
    });
  } catch (error: any) {
    console.error('Reject post error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
