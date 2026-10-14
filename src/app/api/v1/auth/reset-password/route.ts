import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { resetPasswordSchema } from '@/lib/validation/auth.schema';
import { hashPassword } from '@/lib/auth/password';
import { logAuditEvent } from '@/lib/services/audit.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      const errorMsg = (validation.error as any).issues?.[0]?.message || validation.error.message || 'Invalid input';
      return errorResponse(errorMsg, 400);
    }

    const { email, code, newPassword } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return errorResponse('Invalid code or email', 400);
    }

    const verification = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        code,
        type: 'RESET_PASSWORD',
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return errorResponse('Invalid or expired reset code', 400, 'INVALID_CODE');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.emailVerification.update({
        where: { id: verification.id },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          failedLogins: 0,
          lockedUntil: null,
        },
      }),
      // Revoke all existing sessions for security
      prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { revoked: true },
      }),
    ]);

    await logAuditEvent({
      actorId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'USER',
      entityId: user.id,
    });

    return successResponse({
      message: 'Password reset successful. Please log in with your new password.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
