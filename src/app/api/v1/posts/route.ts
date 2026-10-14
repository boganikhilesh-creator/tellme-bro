import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { ROLES, POST_STATUS, PRIORITIES } from '@/lib/constants';
import { hasRole } from '@/lib/auth/rbac';
import { logAuditEvent } from '@/lib/services/audit.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { createPostSchema } from '@/lib/validation/post.schema';
import { validateAndDetectSocialUrl } from '@/lib/utils/url-validator';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const searchParams = req.nextUrl.searchParams;

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const skip = (page - 1) * limit;

    const search = searchParams.get('q') || searchParams.get('search');
    const category = searchParams.get('category');
    const platform = searchParams.get('platform');
    const contentType = searchParams.get('contentType');
    const priority = searchParams.get('priority');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const statusParam = searchParams.get('status');
    const mineOnly = searchParams.get('mine') === 'true';
    const sortBy = searchParams.get('sort') || 'latest';

    const isStaff = session && hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR]);

    const where: any = {
      deletedAt: null,
      isActive: true,
    };

    if (isStaff && statusParam) {
      where.status = statusParam;
    } else if (isStaff && mineOnly) {
      where.createdById = session.id;
      if (statusParam) where.status = statusParam;
    } else {
      where.status = POST_STATUS.PUBLISHED;
      where.OR = [
        { publishAt: null },
        { publishAt: { lte: new Date() } },
      ];
      where.AND = [
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      ];
    }

    if (mineOnly && session) {
      where.createdById = session.id;
    }

    if (platform) {
      where.platform = platform.toUpperCase();
    }

    if (contentType) {
      where.contentType = contentType.toUpperCase();
    }

    if (priority) {
      where.priority = priority.toUpperCase();
    }

    if (category) {
      where.categories = {
        some: {
          category: {
            OR: [
              { id: category },
              { slug: category.toLowerCase() },
            ],
          },
        },
      };
    }

    if (city || state) {
      const locConditions: any[] = [{ isAllLocations: true }];
      if (city) locConditions.push({ city: { contains: city } });
      if (state) locConditions.push({ state: { contains: state } });

      where.locations = {
        some: {
          OR: locConditions,
        },
      };
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term } },
        { description: { contains: term } },
        { tags: { some: { tag: { name: { contains: term } } } } },
        { sourceAttr: { contains: term } },
      ];
    }

    let orderBy: any[] = [];
    if (sortBy === 'priority') {
      orderBy = [{ priority: 'desc' }, { createdAt: 'desc' }];
    } else if (sortBy === 'views') {
      orderBy = [{ viewCount: 'desc' }, { createdAt: 'desc' }];
    } else if (sortBy === 'likes') {
      orderBy = [{ likeCount: 'desc' }, { createdAt: 'desc' }];
    } else {
      orderBy = [{ priority: 'desc' }, { createdAt: 'desc' }];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          locations: true,
          approvals: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { reviewer: { select: { name: true } } },
          },
          _count: { select: { likes: true, favorites: true, reports: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    let userLikedPostIds = new Set<string>();
    let userSavedPostIds = new Set<string>();

    if (session) {
      const postIds = posts.map(p => p.id);
      const [likes, favorites] = await Promise.all([
        prisma.like.findMany({
          where: { userId: session.id, postId: { in: postIds } },
          select: { postId: true },
        }),
        prisma.favorite.findMany({
          where: { userId: session.id, postId: { in: postIds } },
          select: { postId: true },
        }),
      ]);

      likes.forEach(l => userLikedPostIds.add(l.postId));
      favorites.forEach(f => userSavedPostIds.add(f.postId));
    }

    const formattedPosts = posts.map(post => ({
      ...post,
      isLiked: userLikedPostIds.has(post.id),
      isSaved: userSavedPostIds.has(post.id),
      categories: post.categories.map(c => c.category),
      tags: post.tags.map(t => t.tag.name),
    }));

    return successResponse({
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Fetch posts error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || !hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EDITOR])) {
      return errorResponse('Forbidden: Staff role required to curate posts', 403, 'FORBIDDEN');
    }

    const body = await req.json();
    const validation = createPostSchema.safeParse(body);
    if (!validation.success) {
      const msg = (validation.error as any).issues?.[0]?.message || 'Invalid post data';
      return errorResponse(msg, 400);
    }

    const data = validation.data;

    // Validate social URL & detect platform
    const detection = await validateAndDetectSocialUrl(data.originalUrl);
    if (!detection.isValid) {
      return errorResponse(detection.error || 'Invalid or unsupported social media URL', 400);
    }

    const platform = data.platform || detection.platform!;
    const contentType = data.contentType || detection.contentType!;
    const embedUrl = detection.embedUrl;

    const isAdmin = hasRole(session.role, [ROLES.SUPER_ADMIN, ROLES.ADMIN]);
    let initialStatus = POST_STATUS.DRAFT;

    if (data.status) {
      if (data.status === POST_STATUS.PUBLISHED && !isAdmin) {
        initialStatus = POST_STATUS.PENDING;
      } else {
        initialStatus = data.status;
      }
    } else {
      initialStatus = isAdmin ? POST_STATUS.PUBLISHED : POST_STATUS.PENDING;
    }

    // Process Tags
    const tagNames = Array.from(new Set(data.tags || []));
    const tagConnects: { tag: { connectOrCreate: { where: { name: string }; create: { name: string; slug: string } } } }[] = [];

    for (const rawName of tagNames) {
      const clean = rawName.trim().replace(/^#/, '');
      if (clean.length > 0) {
        const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        tagConnects.push({
          tag: {
            connectOrCreate: {
              where: { name: clean },
              create: { name: clean, slug },
            },
          },
        });
      }
    }

    // Prepare post creation
    const post = await prisma.post.create({
      data: {
        title: data.title,
        description: data.description,
        originalUrl: data.originalUrl,
        embedUrl,
        thumbnailUrl: data.thumbnailUrl,
        platform,
        contentType,
        language: data.language || 'en',
        status: initialStatus,
        priority: data.priority || PRIORITIES.STANDARD,
        priorityStart: data.priorityStart ? new Date(data.priorityStart) : null,
        priorityEnd: data.priorityEnd ? new Date(data.priorityEnd) : null,
        publishAt: data.publishAt ? new Date(data.publishAt) : (initialStatus === POST_STATUS.PUBLISHED ? new Date() : null),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        sourceAttr: data.sourceAttr,
        copyrightInfo: data.copyrightInfo,
        createdById: session.id,
        categories: {
          create: data.categoryIds.map(categoryId => ({
            categoryId,
          })),
        },
        tags: {
          create: tagConnects,
        },
        locations: {
          create: (data.locations && data.locations.length > 0)
            ? data.locations.map(loc => ({
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
              }))
            : [{ isAllLocations: true }],
        },
      },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        locations: true,
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    if (isAdmin && initialStatus === POST_STATUS.PUBLISHED) {
      await prisma.contentApproval.create({
        data: {
          postId: post.id,
          reviewerId: session.id,
          action: 'APPROVED',
          reason: 'Published directly by admin',
        },
      });
    }

    await logAuditEvent({
      actorId: session.id,
      action: 'POST_CREATED',
      entityType: 'POST',
      entityId: post.id,
      details: {
        title: post.title,
        platform: post.platform,
        status: post.status,
        priority: post.priority,
      },
    });

    return successResponse({
      post: {
        ...post,
        categories: post.categories.map(c => c.category),
        tags: post.tags.map(t => t.tag.name),
      },
    }, 201);
  } catch (error: any) {
    console.error('Create post error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
