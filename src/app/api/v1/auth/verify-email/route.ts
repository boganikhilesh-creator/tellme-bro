import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { verifyEmailSchema } from '@/lib/validation/auth.schema';
import { signAccessToken, signRefreshToken, hashToken } from '@/lib/auth/tokens';
import { setAuthCookies } from '@/lib/auth/session';
import { logAuditEvent } from '@/lib/services/audit.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = verifyEmailSchema.safeParse(body);

    if (!validation.success) {
      const errorMsg = (validation.error as any).issues?.[0]?.message || validation.error.message || 'Invalid input';
      return errorResponse(errorMsg, 400);
    }

    const { email, code } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return errorResponse('User not found', 404, 'NOT_FOUND');
    }

    if (user.emailVerified) {
      return errorResponse('Email is already verified. Please log in.', 400, 'ALREADY_VERIFIED');
    }

    // Find the latest valid OTP verification record
    const verification = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        code,
        type: 'VERIFY_EMAIL',
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return errorResponse('Invalid or expired verification code', 400, 'INVALID_CODE');
    }

    // Mark code as used and user as verified
    await prisma.$transaction([
      prisma.emailVerification.update({
        where: { id: verification.id },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      }),
    ]);

    // Issue tokens
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const tokenFamily = crypto.randomUUID();
    const tokenId = crypto.randomUUID();
    const refreshToken = signRefreshToken({
      userId: user.id,
      family: tokenFamily,
      tokenId,
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        family: tokenFamily,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent'),
      },
    });

    await logAuditEvent({
      actorId: user.id,
      action: 'EMAIL_VERIFIED',
      entityType: 'USER',
      entityId: user.id,
    });

    const res = successResponse({
      message: 'Email successfully verified',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: true,
      },
    });

    setAuthCookies(res, accessToken, refreshToken);
    return res;
  } catch (error: any) {
    console.error('Email verification error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
