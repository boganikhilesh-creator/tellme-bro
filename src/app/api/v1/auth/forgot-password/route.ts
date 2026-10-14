import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { forgotPasswordSchema } from '@/lib/validation/auth.schema';
import { sendPasswordResetEmail } from '@/lib/services/email.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid email address', 400);
    }

    const { email } = validation.data;
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // To prevent account enumeration, return success even if user doesn't exist
    if (!user) {
      return successResponse({
        message: 'If an account exists with this email, a reset code has been sent.',
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        code: resetCode,
        type: 'RESET_PASSWORD',
        expiresAt,
      },
    });

    await sendPasswordResetEmail(email, resetCode);

    return successResponse({
      message: 'If an account exists with this email, a reset code has been sent.',
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: resetCode } : {}),
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
