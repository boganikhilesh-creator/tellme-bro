import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return errorResponse('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
        role: true,
        avatarUrl: true,
        emailVerified: true,
        totpEnabled: true,
        createdAt: true,
        preferences: true,
        locations: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return errorResponse('User not found', 404, 'NOT_FOUND');
    }

    return successResponse({
      user: {
        ...user,
        primaryLocation: user.locations[0] || null,
      },
    });
  } catch (error: any) {
    console.error('Fetch me error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return errorResponse('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const body = await req.json();
    const updateData: Record<string, any> = {};

    if (body.name && typeof body.name === 'string') {
      updateData.name = body.name.trim();
    }
    if (body.nickname !== undefined) {
      if (typeof body.nickname === 'string' && body.nickname.trim()) {
        const cleanNickname = body.nickname.trim().replace(/^@+/, '');
        const NICKNAME_REGEX = /^[a-zA-Z0-9_]{2,30}$/;
        if (!NICKNAME_REGEX.test(cleanNickname)) {
          return errorResponse(
            'Nickname must be 2-30 characters and contain only letters, numbers, and underscores.',
            400,
            'INVALID_NICKNAME'
          );
        }
        const existing = await prisma.user.findFirst({
          where: {
            nickname: cleanNickname,
            NOT: { id: session.id },
          },
        });
        if (existing) {
          return errorResponse('This nickname is already in use.', 409, 'NICKNAME_TAKEN');
        }
        updateData.nickname = cleanNickname;
      } else {
        updateData.nickname = null;
      }
    }
    if (body.avatarUrl !== undefined) {
      updateData.avatarUrl = body.avatarUrl;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
        role: true,
        avatarUrl: true,
      },
    });

    return successResponse({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Update me error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
