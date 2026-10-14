import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'tellmebro-dev-access-secret-32-chars-long';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'tellmebro-dev-refresh-secret-32-chars-long';
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export interface RefreshTokenPayload {
  userId: string;
  family: string;
  tokenId: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN as any,
  });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN as any,
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    return null;
  }
}

export function signTemp2FAToken(userId: string): string {
  return jwt.sign({ userId, purpose: '2fa_login' }, ACCESS_SECRET, {
    expiresIn: '5m',
  });
}

export function verifyTemp2FAToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, ACCESS_SECRET) as any;
    if (payload.purpose !== '2fa_login') return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
