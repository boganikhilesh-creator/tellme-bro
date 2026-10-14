import { z } from 'zod';
import { ALLOWED_EMAIL_DOMAINS } from '../constants';

export function isAllowedEmailDomain(email: string): boolean {
  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  return (ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(domain);
}

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .refine(
      (email) => isAllowedEmailDomain(email),
      {
        message: `Email domain not permitted. Only standard email providers are allowed (${ALLOWED_EMAIL_DOMAINS.slice(0, 5).join(', ')}, etc.)`,
      }
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().length(6, 'Verification code must be 6 digits'),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().length(6, 'Reset code must be 6 digits'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const totpVerifySchema = z.object({
  code: z.string().trim().length(6, 'TOTP code must be 6 digits'),
  tempToken: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
