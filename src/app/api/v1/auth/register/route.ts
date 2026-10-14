import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { registerSchema } from '@/lib/validation/auth.schema';
import { hashPassword } from '@/lib/auth/password';
import { isSuperAdminEmail } from '@/lib/auth/rbac';
import { ROLES } from '@/lib/constants';
import { sendVerificationOtpEmail } from '@/lib/services/email.service';
import { logAuditEvent } from '@/lib/services/audit.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      const errorMsg = (validation.error as any).issues?.[0]?.message || validation.error.message || 'Invalid input';
      return errorResponse(errorMsg, 400, 'VALIDATION_ERROR');
    }

    const { name, email, password } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return errorResponse('An account with this email address already exists', 409, 'USER_EXISTS');
    }

    // Hash password with Argon2id
    const passwordHash = await hashPassword(password);

    // Check if this matches the SUPER_ADMIN_EMAIL bootstrap
    const isSuperAdmin = isSuperAdminEmail(email);
    const assignedRole = isSuperAdmin ? ROLES.SUPER_ADMIN : ROLES.USER;

    // Create user in database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: assignedRole,
        emailVerified: false,
        preferences: {
          create: {
            personalization: true,
            emailNotifs: true,
          },
        },
      },
    });

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        code: otp,
        type: 'VERIFY_EMAIL',
        expiresAt,
      },
    });

    // Send verification email
    await sendVerificationOtpEmail(email, otp);

    // Audit log
    await logAuditEvent({
      actorId: user.id,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: user.id,
      details: { role: assignedRole, isSuperAdminBootstrap: isSuperAdmin },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    });

    return successResponse(
      {
        message: 'Registration successful. Please verify your email with the 6-digit code sent.',
        email: user.email,
        requiresVerification: true,
      },
      201
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return errorResponse(error.message || 'Internal server error', 500, 'SERVER_ERROR');
  }
}
