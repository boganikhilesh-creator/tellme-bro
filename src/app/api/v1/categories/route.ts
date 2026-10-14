import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { ROLES } from '@/lib/constants';
import { hasRole } from '@/lib/auth/rbac';
import { logAuditEvent } from '@/lib/services/audit.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(req: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      where: {
        parentId: null, // Root categories
        isActive: true,
      },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: { postCategories: true },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return successResponse({ categories });
  } catch (error: any) {
    console.error('Fetch categories error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || !hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN])) {
      return errorResponse('Forbidden: Admin access required', 403, 'FORBIDDEN');
    }

    const body = await req.json();
    const { name, description, iconUrl, parentId, displayOrder } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return errorResponse('Category name must be at least 2 characters', 400);
    }

    // Generate slug
    let slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        iconUrl: iconUrl?.trim() || null,
        parentId: parentId || null,
        displayOrder: typeof displayOrder === 'number' ? displayOrder : 0,
        isActive: true,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    await logAuditEvent({
      actorId: session.id,
      action: 'CATEGORY_CREATED',
      entityType: 'CATEGORY',
      entityId: category.id,
      details: { name: category.name, slug: category.slug, parentId },
    });

    return successResponse({ category }, 201);
  } catch (error: any) {
    console.error('Create category error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
