import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { logAuditEvent } from '@/lib/services/audit.service';

const NICKNAME_REGEX = /^[a-zA-Z0-9_]{2,30}$/;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('check')?.trim().toLowerCase();

    if (!query) {
      return errorResponse('Query parameter "check" is required', 400);
    }

    if (!NICKNAME_REGEX.test(query)) {
      return successResponse({
        available: false,
        valid: false,
        message: 'Nicknames must be 2-30 characters long and contain only letters, numbers, and underscores.',
      });
    }

    const existing = await prisma.user.findFirst({
      where: { nickname: query },
      select: { id: true },
    });

    return successResponse({
      available: !existing,
      valid: true,
      message: existing ? 'This nickname is already taken.' : 'Nickname is available!',
    });
  } catch (error: any) {
    console.error('Check nickname error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return errorResponse('Not authenticated', 401, 'UNAUTHORIZED');
    }

    const body = await req.json();
    const rawNickname = body.nickname;

    if (!rawNickname || typeof rawNickname !== 'string') {
      return errorResponse('Nickname is required', 400, 'VALIDATION_ERROR');
    }

    const cleanNickname = rawNickname.trim().replace(/^@+/, '');

    if (!NICKNAME_REGEX.test(cleanNickname)) {
      return errorResponse(
        'Nickname must be 2-30 characters long and can only contain letters, numbers, and underscores (_).',
        400,
        'INVALID_FORMAT'
      );
    }

    // Check if taken by another user
    const existing = await prisma.user.findFirst({
      where: {
        nickname: cleanNickname,
        NOT: { id: session.id },
      },
    });

    if (existing) {
      return errorResponse('This nickname is already in use by another user.', 409, 'NICKNAME_TAKEN');
    }

    // Update user and preference
    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: {
        nickname: cleanNickname,
      },
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
        role: true,
        avatarUrl: true,
      },
    });

    // Mark as onboarded in UserPreference
    await prisma.userPreference.upsert({
      where: { userId: session.id },
      update: { onboarded: true },
      create: { userId: session.id, onboarded: true },
    });

    await logAuditEvent({
      actorId: session.id,
      action: 'USER_SET_NICKNAME',
      entityType: 'USER',
      entityId: session.id,
      metadata: { nickname: cleanNickname },
    });

    return successResponse({
      message: `Nickname set to @${cleanNickname}`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Set nickname error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
