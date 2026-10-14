import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return errorResponse('Authentication required to file reports', 401, 'UNAUTHORIZED');
    }

    const { id } = await context.params;
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post || post.deletedAt) {
      return errorResponse('Post not found', 404);
    }

    const body = await req.json();
    const { reason, details } = body;

    const validReasons = ['MISLEADING', 'INAPPROPRIATE', 'COPYRIGHT', 'SPAM', 'OFFENSIVE', 'OTHER'];
    if (!reason || !validReasons.includes(reason)) {
      return errorResponse(`Reason must be one of: ${validReasons.join(', ')}`, 400);
    }

    const report = await prisma.report.create({
      data: {
        postId: id,
        reporterId: session.id,
        reason,
        details: details?.trim() || null,
        status: 'PENDING',
      },
    });

    return successResponse({
      message: 'Thank you for reporting. Our moderation team will review this content.',
      reportId: report.id,
    }, 201);
  } catch (error: any) {
    console.error('Report post error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
