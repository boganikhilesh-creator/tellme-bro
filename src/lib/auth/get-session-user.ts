import { NextRequest } from 'next/server';
import { prisma } from '../db';
import { verifyAccessToken } from './tokens';
import { ACCESS_COOKIE_NAME } from './session';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  totpEnabled: boolean;
}

export async function getSessionUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  // Check cookie first
  let token = req.cookies.get(ACCESS_COOKIE_NAME)?.value;

  // Fallback to Authorization: Bearer <token>
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) return null;

  const payload = verifyAccessToken(token);
  if (!payload || !payload.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      totpEnabled: true,
      deletedAt: true,
    },
  });

  if (!user || !user.isActive || user.deletedAt) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    totpEnabled: user.totpEnabled,
  };
}
