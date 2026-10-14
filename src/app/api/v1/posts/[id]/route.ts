import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { ROLES, POST_STATUS } from '@/lib/constants';
import { hasRole } from '@/lib/auth/rbac';
import { logAuditEvent } from '@/lib/services/audit.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { updatePostSchema } from '@/lib/validation/post.schema';
import { validateAndDetectSocialUrl } from '@/lib/utils/url-validator';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getSessionUser(req);

    const post = await prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: {
        createdBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        locations: true,
        approvals: {
          orderBy: { createdAt: 'desc' },
          include: { reviewer: { select: { id: true, name: true, role: true } } },
        },
        _count: { select: { likes: true, favorites: true, reports: true } },
      },
    }).catch(async () => {
      return await prisma.post.findUnique({
        where: { id },
        include: {
          createdBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          locations: true,
          approvals: {
            orderBy: { createdAt: 'desc' },
            include: { reviewer: { select: { id: true, name: true, role: true } } },
          },
          _count: { select: { likes: true, favorites: true, reports: true } },
        },
      });
    });

    if (!post || post.deletedAt) {
      return errorResponse('Post not found', 404);
    }

    const isStaff = session && hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR]);
    const isOwner = session && session.id === post.createdById;

    if (post.status !== POST_STATUS.PUBLISHED && !isStaff && !isOwner) {
      return errorResponse('Post not found or unpublished', 404);
    }

    let isLiked = false;
    let isSaved = false;

    if (session) {
      const [like, fav] = await Promise.all([
        prisma.like.findUnique({
          where: { userId_postId: { userId: session.id, postId: id } },
        }),
        prisma.favorite.findUnique({
          where: { userId_postId: { userId: session.id, postId: id } },
        }),
      ]);
      isLiked = !!like;
      isSaved = !!fav;
    }

    return successResponse({
      post: {
        ...post,
        isLiked,
        isSaved,
        categories: post.categories.map(c => c.category),
        tags: post.tags.map(t => t.tag.name),
      },
    });
  } catch (error: any) {
    console.error('Fetch post detail error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || !hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR])) {
      return errorResponse('Forbidden: Staff role required', 403, 'FORBIDDEN');
    }

    const { id } = await context.params;
    const existing = await prisma.post.findUnique({
      where: { id },
      include: { categories: true, tags: true, locations: true },
    });

    if (!existing || existing.deletedAt) {
      return errorResponse('Post not found', 404);
    }

    const isAdmin = hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    const isOwner = session.id === existing.createdById;

    if (!isAdmin && !isOwner) {
      return errorResponse('Forbidden: You can only edit your own posts', 403, 'FORBIDDEN');
    }

    if (!isAdmin && existing.status === POST_STATUS.PUBLISHED) {
      return errorResponse('Cannot edit a published post. Ask an administrator.', 403);
    }

    const body = await req.json();
    const validation = updatePostSchema.safeParse(body);
    if (!validation.success) {
      const msg = (validation.error as any).issues?.[0]?.message || 'Invalid post data';
      return errorResponse(msg, 400);
    }

    const data = validation.data;
    const updateData: any = {};

    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
    if (data.sourceAttr !== undefined) updateData.sourceAttr = data.sourceAttr;
    if (data.copyrightInfo !== undefined) updateData.copyrightInfo = data.copyrightInfo;

    if (data.originalUrl && data.originalUrl !== existing.originalUrl) {
      const detection = await validateAndDetectSocialUrl(data.originalUrl);
      if (!detection.isValid) {
        return errorResponse(detection.error || 'Invalid social URL', 400);
      }
      updateData.originalUrl = data.originalUrl;
      updateData.platform = data.platform || detection.platform;
      updateData.contentType = data.contentType || detection.contentType;
      updateData.embedUrl = detection.embedUrl;
    }

    if (isAdmin) {
      if (data.status) updateData.status = data.status;
      if (data.priority) updateData.priority = data.priority;
      if (data.priorityStart !== undefined) updateData.priorityStart = data.priorityStart ? new Date(data.priorityStart) : null;
      if (data.priorityEnd !== undefined) updateData.priorityEnd = data.priorityEnd ? new Date(data.priorityEnd) : null;
      if (data.publishAt !== undefined) updateData.publishAt = data.publishAt ? new Date(data.publishAt) : null;
      if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    } else {
      if (data.status && [POST_STATUS.DRAFT, POST_STATUS.PENDING].includes(data.status)) {
        updateData.status = data.status;
      }
    }

    await prisma.$transaction(async (tx) => {
      if (data.categoryIds) {
        await tx.postCategory.deleteMany({ where: { postId: id } });
        await tx.postCategory.createMany({
          data: data.categoryIds.map(categoryId => ({
            postId: id,
            categoryId,
          })),
        });
      }

      if (data.tags) {
        await tx.postTag.deleteMany({ where: { postId: id } });
        for (const rawName of Array.from(new Set(data.tags))) {
          const clean = rawName.trim().replace(/^#/, '');
          if (clean.length > 0) {
            const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const tag = await tx.tag.upsert({
              where: { name: clean },
              update: {},
              create: { name: clean, slug },
            });
            await tx.postTag.create({
              data: { postId: id, tagId: tag.id },
            });
          }
        }
      }

      if (data.locations) {
        await tx.postLocation.deleteMany({ where: { postId: id } });
        await tx.postLocation.createMany({
          data: data.locations.map(loc => ({
            postId: id,
            locality: loc.locality || null,
            city: loc.city || null,
            district: loc.district || null,
            state: loc.state || null,
            country: loc.country || 'India',
            postalCode: loc.postalCode || null,
            latitude: loc.latitude || null,
            longitude: loc.longitude || null,
            radiusKm: loc.radiusKm || null,
            isAllLocations: loc.isAllLocations || false,
          })),
        });
      }

      await tx.post.update({
        where: { id },
        data: updateData,
      });
    });

    const updated = await prisma.post.findUnique({
      where: { id },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        locations: true,
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    await logAuditEvent({
      actorId: session.id,
      action: 'POST_UPDATED',
      entityType: 'POST',
      entityId: id,
      details: { changes: updateData },
    });

    return successResponse({
      post: {
        ...updated,
        categories: updated?.categories.map(c => c.category) || [],
        tags: updated?.tags.map(t => t.tag.name) || [],
      },
    });
  } catch (error: any) {
    console.error('Update post error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || !hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR])) {
      return errorResponse('Forbidden: Staff role required', 403, 'FORBIDDEN');
    }

    const { id } = await context.params;
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post || post.deletedAt) {
      return errorResponse('Post not found', 404);
    }

    const isAdmin = hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    const isOwner = session.id === post.createdById;

    if (!isAdmin && !isOwner) {
      return errorResponse('Forbidden: You can only delete your own posts', 403, 'FORBIDDEN');
    }

    await prisma.post.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        status: POST_STATUS.ARCHIVED,
      },
    });

    await logAuditEvent({
      actorId: session.id,
      action: 'POST_DELETED',
      entityType: 'POST',
      entityId: id,
      details: { title: post.title },
    });

    return successResponse({ message: 'Post removed successfully' });
  } catch (error: any) {
    console.error('Delete post error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
