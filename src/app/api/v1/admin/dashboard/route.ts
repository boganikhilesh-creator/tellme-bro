import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { ROLES } from '@/lib/constants';
import { hasRole } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || !hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN])) {
      return errorResponse('Forbidden: Administrative privileges required', 403, 'FORBIDDEN');
    }

    const [
      totalUsers,
      activeUsers,
      editorCount,
      adminCount,
      totalPosts,
      pendingPosts,
      publishedPosts,
      totalCategories,
      totalAds,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      prisma.user.count({ where: { role: ROLES.EDITOR, deletedAt: null } }),
      prisma.user.count({ where: { role: ROLES.ADMIN, deletedAt: null } }),
      prisma.post.count({ where: { deletedAt: null } }),
      prisma.post.count({ where: { status: 'PENDING', deletedAt: null } }),
      prisma.post.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      prisma.category.count(),
      prisma.ad.count(),
      prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { name: true, email: true, role: true },
          },
        },
      }),
    ]);

    return successResponse({
      stats: {
        totalUsers,
        activeUsers,
        editorCount,
        adminCount,
        totalPosts,
        pendingPosts,
        publishedPosts,
        totalCategories,
        totalAds,
      },
      recentActivity: recentAuditLogs,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
