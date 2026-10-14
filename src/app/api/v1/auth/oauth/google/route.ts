import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { signAccessToken, signRefreshToken, hashToken } from '@/lib/auth/tokens';
import { setAuthCookies } from '@/lib/auth/session';
import { ROLES } from '@/lib/constants';
import { isSuperAdminEmail } from '@/lib/auth/rbac';
import { logAuditEvent } from '@/lib/services/audit.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/v1/auth/oauth/google/callback`;

  // Dev simulation or fallback test
  if (action === 'demo' || !clientId || !clientSecret) {
    if (action === 'demo') {
      const demoEmail = searchParams.get('email') || 'google.user@gmail.com';
      const demoName = searchParams.get('name') || 'Google Demo User';
      const googleId = 'google_demo_' + crypto.randomBytes(4).toString('hex');

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: demoEmail },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: demoEmail,
            name: demoName,
            emailVerified: true,
            role: isSuperAdminEmail(demoEmail) ? ROLES.SUPER_ADMIN : ROLES.USER,
            preferences: {
              create: { personalization: true },
            },
          },
        });
      }

      // Link OAuth identity
      const existingOauth = await prisma.oAuthIdentity.findFirst({
        where: { provider: 'GOOGLE', providerId: googleId },
      });

      if (!existingOauth) {
        await prisma.oAuthIdentity.create({
          data: {
            userId: user.id,
            provider: 'GOOGLE',
            providerId: googleId,
            providerEmail: demoEmail,
          },
        });
      }

      const accessToken = signAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      const tokenFamily = crypto.randomUUID();
      const refreshToken = signRefreshToken({
        userId: user.id,
        family: tokenFamily,
        tokenId: crypto.randomUUID(),
      });

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(refreshToken),
          family: tokenFamily,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await logAuditEvent({
        actorId: user.id,
        action: 'OAUTH_LOGIN_GOOGLE_DEMO',
        entityType: 'USER',
        entityId: user.id,
      });

      const targetPath = !user.nickname ? '/onboarding/nickname' : '/home';
      const response = NextResponse.redirect(new URL(targetPath, req.url));
      setAuthCookies(response, accessToken, refreshToken);
      return response;
    }

    return NextResponse.json({
      configured: false,
      message: 'Google OAuth credentials not configured in .env. Use action=demo to test locally.',
      requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    });
  }

  // Real Google OAuth redirect
  const state = crypto.randomBytes(16).toString('hex');
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'consent');

  const res = NextResponse.redirect(googleAuthUrl.toString());
  res.cookies.set('oauth_state', state, { httpOnly: true, maxAge: 600, path: '/' });
  return res;
}
