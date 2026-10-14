import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

export interface TOTPSetupResult {
  secret: string;
  uri: string;
  qrCodeDataUrl: string;
}

export async function generateTOTPSecret(email: string): Promise<TOTPSetupResult> {
  const totp = new OTPAuth.TOTP({
    issuer: 'Tellme Bro',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  const uri = totp.toString();
  const qrCodeDataUrl = await QRCode.toDataURL(uri);

  return {
    secret: totp.secret.base32,
    uri,
    qrCodeDataUrl,
  };
}

export function verifyTOTPCode(secret: string, token: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'Tellme Bro',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // delta !== null means valid token within window (-1, 0, +1 period)
    const delta = totp.validate({ token: token.trim(), window: 1 });
    return delta !== null;
  } catch (err) {
    console.error('TOTP validation error:', err);
    return false;
  }
}
