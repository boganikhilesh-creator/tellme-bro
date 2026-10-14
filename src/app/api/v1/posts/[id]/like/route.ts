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
      return errorResponse('Authentication required to like posts', 401, 'UNAUTHORIZED');
    }

    const { id } = await context.params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: { categories: { take: 1 } },
    });

    if (!post || post.deletedAt) {
      return errorResponse('Post not found', 404);
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: session.id,
          postId: id,
        },
      },
    });

    let isLiked = false;
    let likeCount = post.likeCount;

    if (existingLike) {
      // Unlike
      await prisma.$transaction([
        prisma.like.delete({
          where: { userId_postId: { userId: session.id, postId: id } },
        }),
        prisma.post.update({
          where: { id },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      isLiked = false;
      likeCount = Math.max(0, likeCount - 1);
    } else {
      // Like
      await prisma.$transaction([
        prisma.like.create({
          data: {
            userId: session.id,
            postId: id,
          },
        }),
        prisma.post.update({
          where: { id },
        data: { likeCount: { increment: 1 } },
      }),
      // Log interaction for personalization
      prisma.interaction.create({
        data: {
          userId: session.id,
          postId: id,
          type: 'LIKE',
          categoryId: post.categories[0]?.categoryId || null,
        },
      }),
    ]);
      isLiked = true;
      likeCount = likeCount + 1;
    }

    return successResponse({
      isLiked,
      likeCount,
      message: isLiked ? 'Post liked' : 'Post unliked',
    });
  } catch (error: any) {
    console.error('Like post error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
