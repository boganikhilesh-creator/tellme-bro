import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyTemp2FAToken } from '@/lib/auth/tokens';
import { sendLoginOtpEmail } from '@/lib/services/email.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tempToken } = body;

    if (!tempToken) {
      return errorResponse('Temporary session token required', 400);
    }

    const payload = verifyTemp2FAToken(tempToken);
    if (!payload) {
      return errorResponse('Session expired. Please log in again.', 401, 'EXPIRED_TOKEN');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return errorResponse('User account not found', 404);
    }

    // Invalidate previous OTPs
    await prisma.emailVerification.updateMany({
      where: {
        userId: user.id,
        type: 'LOGIN_OTP',
        used: false,
      },
      data: { used: true },
    });

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        code: otp,
        type: 'LOGIN_OTP',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendLoginOtpEmail(user.email, otp);

    return successResponse({
      message: `A new 6-digit verification code has been sent to ${user.email}.`,
    });
  } catch (error: any) {
    console.error('Resend OTP error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
