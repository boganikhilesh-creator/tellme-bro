import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { REFRESH_COOKIE_NAME, setAuthCookies, clearAuthCookies } from '@/lib/auth/session';
import { verifyRefreshToken, signAccessToken, signRefreshToken, hashToken } from '@/lib/auth/tokens';
import { logAuditEvent } from '@/lib/services/audit.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(req: NextRequest) {
  try {
    const rawRefreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

    if (!rawRefreshToken) {
      return errorResponse('Refresh token missing', 401, 'UNAUTHORIZED');
    }

    const payload = verifyRefreshToken(rawRefreshToken);
    if (!payload || !payload.userId || !payload.family) {
      const res = errorResponse('Invalid refresh token', 401, 'INVALID_TOKEN');
      clearAuthCookies(res);
      return res;
    }

    const tokenHash = hashToken(rawRefreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      const res = errorResponse('Token not recognized', 401, 'INVALID_TOKEN');
      clearAuthCookies(res);
      return res;
    }

    // Token Reuse / Breach Detection:
    // If this token was already revoked, someone may have intercepted it!
    if (storedToken.revoked) {
      // Revoke all tokens in this family
      await prisma.refreshToken.updateMany({
        where: { family: payload.family },
        data: { revoked: true },
      });

      await logAuditEvent({
        actorId: storedToken.userId,
        action: 'TOKEN_BREACH_DETECTED',
        entityType: 'REFRESH_TOKEN_FAMILY',
        details: { family: payload.family },
      });

      const res = errorResponse('Session compromise detected. All sessions terminated. Please log in again.', 401, 'BREACH_DETECTED');
      clearAuthCookies(res);
      return res;
    }

    // Check expiration
    if (storedToken.expiresAt < new Date()) {
      const res = errorResponse('Refresh token expired', 401, 'TOKEN_EXPIRED');
      clearAuthCookies(res);
      return res;
    }

    const user = storedToken.user;
    if (!user || !user.isActive || user.deletedAt) {
      const res = errorResponse('User account is inactive', 403, 'INACTIVE_USER');
      clearAuthCookies(res);
      return res;
    }

    // Revoke old refresh token (single-use)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    // Issue new access + refresh token in same family
    const newAccessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const newRefreshToken = signRefreshToken({
      userId: user.id,
      family: payload.family,
      tokenId: crypto.randomUUID(),
    });

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent');

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(newRefreshToken),
        family: payload.family,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: clientIp,
        userAgent,
      },
    });

    const res = successResponse({
      message: 'Token refreshed',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    setAuthCookies(res, newAccessToken, newRefreshToken);
    return res;
  } catch (error: any) {
    console.error('Refresh token error:', error);
    const res = errorResponse(error.message || 'Internal server error', 500);
    clearAuthCookies(res);
    return res;
  }
}
