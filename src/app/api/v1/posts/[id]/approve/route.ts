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
      return errorResponse('Forbidden: Admin access required to approve posts', 403, 'FORBIDDEN');
    }

    const { id } = await context.params;
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post || post.deletedAt) {
      return errorResponse('Post not found', 404);
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine
    }

    const now = new Date();
    const scheduledDate = body.publishAt ? new Date(body.publishAt) : now;
    const isScheduled = scheduledDate > now;
    const targetStatus = isScheduled ? POST_STATUS.SCHEDULED : POST_STATUS.PUBLISHED;

    const [updatedPost, approval] = await prisma.$transaction([
      prisma.post.update({
        where: { id },
        data: {
          status: targetStatus,
          publishAt: scheduledDate,
          priority: body.priority || post.priority,
          priorityStart: body.priorityStart ? new Date(body.priorityStart) : post.priorityStart,
          priorityEnd: body.priorityEnd ? new Date(body.priorityEnd) : post.priorityEnd,
        },
      }),
      prisma.contentApproval.create({
        data: {
          postId: id,
          reviewerId: session.id,
          action: 'APPROVED',
          reason: body.note || 'Approved by editorial administrator',
        },
      }),
    ]);

    await logAuditEvent({
      actorId: session.id,
      action: 'POST_APPROVED',
      entityType: 'POST',
      entityId: id,
      details: {
        status: targetStatus,
        publishAt: scheduledDate,
        priority: updatedPost.priority,
      },
    });

    return successResponse({
      message: isScheduled ? 'Post approved and scheduled for publishing' : 'Post approved and published successfully',
      post: updatedPost,
      approval,
    });
  } catch (error: any) {
    console.error('Approve post error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
