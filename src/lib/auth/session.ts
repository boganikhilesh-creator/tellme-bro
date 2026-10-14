import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const ACCESS_COOKIE_NAME = 'tb_access_token';
export const REFRESH_COOKIE_NAME = 'tb_refresh_token';

const isProduction = process.env.NODE_ENV === 'production';

export async function getCookiesFromHeaders() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  return { accessToken, refreshToken };
}

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken?: string
) {
  // Access Token: 15 minutes
  response.cookies.set(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 mins
  });

  // Refresh Token: 7 days
  if (refreshToken) {
    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set(REFRESH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
