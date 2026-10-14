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
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const savedState = req.cookies.get('oauth_state')?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL('/login?error=invalid_oauth_state', req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/v1/auth/oauth/google/callback`;

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Google token exchange error:', tokenData);
      return NextResponse.redirect(new URL('/login?error=oauth_token_exchange_failed', req.url));
    }

    // Fetch user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    const googleEmail = profile.email;
    const googleName = profile.name || profile.given_name || 'Google User';
    const googleId = profile.id;
    const googleAvatar = profile.picture;

    // Safe linking per specification:
    // Check if user with this email exists
    let user = await prisma.user.findUnique({
      where: { email: googleEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleEmail,
          name: googleName,
          avatarUrl: googleAvatar,
          emailVerified: true,
          role: isSuperAdminEmail(googleEmail) ? ROLES.SUPER_ADMIN : ROLES.USER,
          preferences: {
            create: { personalization: true },
          },
        },
      });
    }

    // Link or update identity
    await prisma.oAuthIdentity.upsert({
      where: {
        provider_providerId: {
          provider: 'GOOGLE',
          providerId: googleId,
        },
      },
      update: {
        providerEmail: googleEmail,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      },
      create: {
        userId: user.id,
        provider: 'GOOGLE',
        providerId: googleId,
        providerEmail: googleEmail,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
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
      action: 'OAUTH_LOGIN_GOOGLE',
      entityType: 'USER',
      entityId: user.id,
    });

    const targetPath = !user.nickname ? '/onboarding/nickname' : '/home';
    const res = NextResponse.redirect(new URL(targetPath, req.url));
    setAuthCookies(res, accessToken, refreshToken);
    res.cookies.delete('oauth_state');
    return res;
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_error', req.url));
  }
}
