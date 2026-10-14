import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { ROLES, POST_STATUSES } from '@/lib/constants';
import { hasRole } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || !hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN])) {
      return errorResponse('Forbidden: Admin access required', 403, 'FORBIDDEN');
    }

    const posts = await prisma.post.findMany({
      where: {
        status: POST_STATUSES.PENDING,
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        locations: true,
      },
      orderBy: { createdAt: 'asc' }, // FIFO queue
    });

    const formatted = posts.map(post => ({
      ...post,
      categories: post.categories.map(c => c.category),
      tags: post.tags.map(t => t.tag.name),
    }));

    return successResponse({
      queue: formatted,
      count: formatted.length,
    });
  } catch (error: any) {
    console.error('Fetch pending posts error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
