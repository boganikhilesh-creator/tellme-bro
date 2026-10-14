import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { signAccessToken, signRefreshToken, hashToken } from '@/lib/auth/tokens';
import { setAuthCookies } from '@/lib/auth/session';
import { ROLES } from '@/lib/constants';
import { isSuperAdminEmail } from '@/lib/auth/rbac';
import { logAuditEvent } from '@/lib/services/audit.service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/v1/auth/oauth/facebook/callback`;

  // Dev simulation or fallback test
  if (action === 'demo' || !appId || !appSecret) {
    if (action === 'demo') {
      const demoEmail = searchParams.get('email') || 'facebook.user@gmail.com';
      const demoName = searchParams.get('name') || 'Facebook Demo User';
      const fbId = 'fb_demo_' + crypto.randomBytes(4).toString('hex');

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

      await prisma.oAuthIdentity.upsert({
        where: {
          provider_providerId: {
            provider: 'FACEBOOK',
            providerId: fbId,
          },
        },
        update: { providerEmail: demoEmail },
        create: {
          userId: user.id,
          provider: 'FACEBOOK',
          providerId: fbId,
          providerEmail: demoEmail,
        },
      });

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
        action: 'OAUTH_LOGIN_FACEBOOK_DEMO',
        entityType: 'USER',
        entityId: user.id,
      });

      const response = NextResponse.redirect(new URL('/home', req.url));
      setAuthCookies(response, accessToken, refreshToken);
      return response;
    }

    return NextResponse.json({
      configured: false,
      message: 'Facebook Login credentials not configured in .env. Use action=demo to test locally.',
      requiredEnvVars: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'],
    });
  }

  // Real Facebook OAuth redirect
  const state = crypto.randomBytes(16).toString('hex');
  const fbAuthUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  fbAuthUrl.searchParams.set('client_id', appId);
  fbAuthUrl.searchParams.set('redirect_uri', redirectUri);
  fbAuthUrl.searchParams.set('state', state);
  fbAuthUrl.searchParams.set('scope', 'email,public_profile');

  const res = NextResponse.redirect(fbAuthUrl.toString());
  res.cookies.set('oauth_state_fb', state, { httpOnly: true, maxAge: 600, path: '/' });
  return res;
}
