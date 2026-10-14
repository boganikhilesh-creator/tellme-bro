import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { verifyTemp2FAToken, signAccessToken, signRefreshToken, hashToken } from '@/lib/auth/tokens';
import { verifyTOTPCode } from '@/lib/auth/totp';
import { setAuthCookies } from '@/lib/auth/session';
import { logAuditEvent } from '@/lib/services/audit.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, tempToken } = body;

    if (!code || typeof code !== 'string' || code.trim().length !== 6) {
      return errorResponse('Valid 6-digit verification code is required', 400);
    }

    let user: any = null;
    let isLoginChallenge = false;

    if (tempToken) {
      const payload = verifyTemp2FAToken(tempToken);
      if (!payload) {
        return errorResponse('Session expired. Please log in again.', 401, 'EXPIRED_TOKEN');
      }
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      isLoginChallenge = true;
    } else {
      const sessionUser = await getSessionUser(req);
      if (!sessionUser) {
        return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
      }
      user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
      });
    }

    if (!user) {
      return errorResponse('User account not found', 404);
    }

    const trimmedCode = code.trim();

    // 1. Primary: Verify against EmailVerification OTP table
    const emailVerification = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        code: trimmedCode,
        type: 'LOGIN_OTP',
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    let isValid = false;

    if (emailVerification) {
      isValid = true;
      // Mark OTP as used
      await prisma.emailVerification.update({
        where: { id: emailVerification.id },
        data: { used: true },
      });
    } else if (user.totpSecret) {
      // Fallback: Verify legacy TOTP code if secret exists
      isValid = verifyTOTPCode(user.totpSecret, trimmedCode);
    }

    if (!isValid) {
      return errorResponse('Invalid or expired verification code. Please check your email.', 400, 'INVALID_CODE');
    }

    // If completing login challenge, issue auth cookies
    if (isLoginChallenge) {
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

      const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
      const userAgent = req.headers.get('user-agent');

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(refreshToken),
          family: tokenFamily,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          ipAddress: clientIp,
          userAgent,
        },
      });

      await logAuditEvent({
        actorId: user.id,
        action: 'USER_LOGGED_IN_EMAIL_OTP',
        entityType: 'USER',
        entityId: user.id,
        ipAddress: clientIp,
        userAgent,
      });

      const res = successResponse({
        message: 'Email verification confirmed. Login complete.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });

      setAuthCookies(res, accessToken, refreshToken);
      return res;
    }

    return successResponse({
      message: 'Email verification code verified successfully',
      verified: true,
    });
  } catch (error: any) {
    console.error('Email OTP verification error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
