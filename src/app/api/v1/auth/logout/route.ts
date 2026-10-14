import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/get-session-user';
import { REFRESH_COOKIE_NAME, clearAuthCookies } from '@/lib/auth/session';
import { hashToken } from '@/lib/auth/tokens';
import { logAuditEvent } from '@/lib/services/audit.service';
import { successResponse } from '@/lib/utils/api-response';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revoked: true },
      });
    }

    if (session) {
      await logAuditEvent({
        actorId: session.id,
        action: 'USER_LOGGED_OUT',
        entityType: 'USER',
        entityId: session.id,
      });
    }

    const res = successResponse({ message: 'Successfully logged out' });
    clearAuthCookies(res);
    return res;
  } catch (error: any) {
    console.error('Logout error:', error);
    const res = successResponse({ message: 'Logged out' });
    clearAuthCookies(res);
    return res;
  }
}
