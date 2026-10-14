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
      return errorResponse('Authentication required to save posts', 401, 'UNAUTHORIZED');
    }

    const { id } = await context.params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: { categories: { take: 1 } },
    });

    if (!post || post.deletedAt) {
      return errorResponse('Post not found', 404);
    }

    const existingFav = await prisma.favorite.findUnique({
      where: {
        userId_postId: {
          userId: session.id,
          postId: id,
        },
      },
    });

    let isSaved = false;
    let saveCount = post.saveCount;

    if (existingFav) {
      // Unsave
      await prisma.$transaction([
        prisma.favorite.delete({
          where: { userId_postId: { userId: session.id, postId: id } },
        }),
        prisma.post.update({
          where: { id },
          data: { saveCount: { decrement: 1 } },
        }),
      ]);
      isSaved = false;
      saveCount = Math.max(0, saveCount - 1);
    } else {
      // Save
      await prisma.$transaction([
        prisma.favorite.create({
          data: {
            userId: session.id,
            postId: id,
          },
        }),
        prisma.post.update({
          where: { id },
          data: { saveCount: { increment: 1 } },
        }),
        prisma.interaction.create({
          data: {
            userId: session.id,
            postId: id,
            type: 'SAVE',
            categoryId: post.categories[0]?.categoryId || null,
          },
        }),
      ]);
      isSaved = true;
      saveCount = saveCount + 1;
    }

    return successResponse({
      isSaved,
      saveCount,
      message: isSaved ? 'Post saved to favorites' : 'Post removed from favorites',
    });
  } catch (error: any) {
    console.error('Save post error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
