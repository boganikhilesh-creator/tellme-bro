import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { ROLES } from '@/lib/constants';
import { hasRole } from '@/lib/auth/rbac';
import { logAuditEvent } from '@/lib/services/audit.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: { orderBy: { displayOrder: 'asc' } },
        _count: { select: { postCategories: true } },
      },
    });

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    return successResponse({ category });
  } catch (error: any) {
    console.error('Fetch category error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || !hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN])) {
      return errorResponse('Forbidden: Admin access required', 403, 'FORBIDDEN');
    }

    const { id } = await context.params;
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('Category not found', 404);
    }

    const body = await req.json();
    const { name, description, iconUrl, parentId, displayOrder, isActive } = body;

    const data: any = {};
    if (typeof name === 'string' && name.trim().length >= 2) {
      data.name = name.trim();
    }
    if (description !== undefined) {
      data.description = description ? description.trim() : null;
    }
    if (iconUrl !== undefined) {
      data.iconUrl = iconUrl ? iconUrl.trim() : null;
    }
    if (parentId !== undefined) {
      if (parentId === id) {
        return errorResponse('Category cannot be its own parent', 400);
      }
      data.parentId = parentId || null;
    }
    if (typeof displayOrder === 'number') {
      data.displayOrder = displayOrder;
    }
    if (typeof isActive === 'boolean') {
      data.isActive = isActive;
    }

    const updated = await prisma.category.update({
      where: { id },
      data,
      include: {
        parent: true,
        children: true,
      },
    });

    await logAuditEvent({
      actorId: session.id,
      action: 'CATEGORY_UPDATED',
      entityType: 'CATEGORY',
      entityId: id,
      details: { changes: data },
    });

    return successResponse({ category: updated });
  } catch (error: any) {
    console.error('Update category error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || !hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN])) {
      return errorResponse('Forbidden: Admin access required', 403, 'FORBIDDEN');
    }

    const { id } = await context.params;
    const existing = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { postCategories: true, children: true } },
      },
    });

    if (!existing) {
      return errorResponse('Category not found', 404);
    }

    const force = req.nextUrl.searchParams.get('force') === 'true';

    if (existing._count.children > 0) {
      return errorResponse('Cannot delete category with subcategories. Reassign or delete subcategories first.', 400);
    }

    if (existing._count.postCategories > 0 && !force) {
      await prisma.category.update({
        where: { id },
        data: { isActive: false },
      });

      await logAuditEvent({
        actorId: session.id,
        action: 'CATEGORY_DEACTIVATED',
        entityType: 'CATEGORY',
        entityId: id,
        details: { reason: 'Has associated posts; deactivated instead of deleted' },
      });

      return successResponse({
        message: 'Category has associated posts and was marked inactive.',
        deactivated: true,
      });
    }

    await prisma.category.delete({ where: { id } });

    await logAuditEvent({
      actorId: session.id,
      action: 'CATEGORY_DELETED',
      entityType: 'CATEGORY',
      entityId: id,
      details: { name: existing.name, slug: existing.slug },
    });

    return successResponse({ message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('Delete category error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
