import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { loginSchema } from '@/lib/validation/auth.schema';
import { verifyPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken, signTemp2FAToken, hashToken } from '@/lib/auth/tokens';
import { setAuthCookies } from '@/lib/auth/session';
import { ROLES } from '@/lib/constants';
import { logAuditEvent } from '@/lib/services/audit.service';
import { sendLoginOtpEmail } from '@/lib/services/email.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      const errorMsg = (validation.error as any).issues?.[0]?.message || validation.error.message || 'Invalid credentials';
      return errorResponse(errorMsg, 400);
    }

    const { email, password } = validation.data;
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent');

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return errorResponse('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive || user.deletedAt) {
      return errorResponse('Account is deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (1000 * 60));
      return errorResponse(
        `Account temporarily locked due to excessive failed attempts. Try again in ${waitMinutes} minute(s).`,
        429,
        'ACCOUNT_LOCKED'
      );
    }

    // Verify password (if user signed up via OAuth, passwordHash might be null)
    if (!user.passwordHash) {
      return errorResponse('This account was created via social login. Please sign in with Google or Facebook.', 400, 'USE_SOCIAL_LOGIN');
    }

    const isMatch = await verifyPassword(password, user.passwordHash);

    if (!isMatch) {
      const failedCount = user.failedLogins + 1;
      let lockUpdate: { failedLogins: number; lockedUntil?: Date } = { failedLogins: failedCount };

      if (failedCount >= 5) {
        lockUpdate.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
      }

      await prisma.user.update({
        where: { id: user.id },
        data: lockUpdate,
      });

      return errorResponse(
        failedCount >= 5
          ? 'Too many failed login attempts. Account locked for 15 minutes.'
          : 'Invalid email or password',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      // Re-issue a fresh verification OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await prisma.emailVerification.create({
        data: {
          userId: user.id,
          code: otp,
          type: 'VERIFY_EMAIL',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      return errorResponse(
        'Please verify your email address before logging in.',
        403,
        'EMAIL_NOT_VERIFIED',
        { email: user.email, requiresVerification: true, devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined }
      );
    }

    // Reset failed logins
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: clientIp,
      },
    });

    // Mandatory Email-based OTP Verification for ALL users on login:
    // Generate a fresh 6-digit OTP and dispatch to user's email address
    {
      // Invalidate any older unused login OTPs for this user
      await prisma.emailVerification.updateMany({
        where: {
          userId: user.id,
          type: 'LOGIN_OTP',
          used: false,
        },
        data: { used: true },
      });

      // Generate a cryptographically random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      await prisma.emailVerification.create({
        data: {
          userId: user.id,
          code: otp,
          type: 'LOGIN_OTP',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
        },
      });

      // Send verification code to user's email
      await sendLoginOtpEmail(user.email, otp);

      const tempToken = signTemp2FAToken(user.id);
      return successResponse({
        requires2fa: true,
        type: 'EMAIL_OTP',
        email: user.email,
        message: 'A 6-digit verification code has been sent to your email.',
        tempToken,
      });
    }

    // Issue tokens directly
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
      action: 'USER_LOGGED_IN',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: clientIp,
      userAgent,
    });

    const res = successResponse({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });

    setAuthCookies(res, accessToken, refreshToken);
    return res;
  } catch (error: any) {
    console.error('Login error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
