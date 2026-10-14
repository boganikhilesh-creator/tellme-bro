import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { verifyTemp2FAToken } from '@/lib/auth/tokens';
import { generateTOTPSecret } from '@/lib/auth/totp';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;
    let userEmail: string | null = null;

    // First try session
    const sessionUser = await getSessionUser(req);
    if (sessionUser) {
      userId = sessionUser.id;
      userEmail = sessionUser.email;
    } else {
      // Or check tempToken from body (first-time Super Admin bootstrap login)
      const body = await req.json().catch(() => ({}));
      if (body.tempToken) {
        const payload = verifyTemp2FAToken(body.tempToken);
        if (payload) {
          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true },
          });
          if (user) {
            userId = user.id;
            userEmail = user.email;
          }
        }
      }
    }

    if (!userId || !userEmail) {
      return errorResponse('Unauthorized or invalid session', 401, 'UNAUTHORIZED');
    }

    // Generate TOTP Secret & QR Code Data URL
    const { secret, uri, qrCodeDataUrl } = await generateTOTPSecret(userEmail);

    // Save temporary secret to user (will be finalized once verified)
    await prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret },
    });

    return successResponse({
      message: 'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)',
      secret,
      qrCodeDataUrl,
      uri,
    });
  } catch (error: any) {
    console.error('2FA setup error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
