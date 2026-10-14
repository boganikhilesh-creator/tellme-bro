import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function run() {
  console.log('🧪 Verifying new Super Admin: swanikhyd@gmail.com ...');

  // 1. Check user in DB
  const user = await prisma.user.findUnique({
    where: { email: 'swanikhyd@gmail.com' },
  });

  if (!user) {
    console.error('❌ User not found in database!');
    process.exit(1);
  }

  console.log('✅ Found user:', {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
  });

  if (user.role !== 'SUPER_ADMIN') {
    console.error(`❌ Expected SUPER_ADMIN but got ${user.role}`);
    process.exit(1);
  }

  // 2. Verify password hash matches
  if (!user.passwordHash) {
    console.error('❌ No password hash found!');
    process.exit(1);
  }

  const isValidPassword = await argon2.verify(user.passwordHash, 'Swanik@654774');
  if (!isValidPassword) {
    console.error('❌ Password verification failed for Swanik@654774!');
    process.exit(1);
  }
  console.log('✅ Password hash successfully verified with Swanik@654774.');

  // 3. Test Login API endpoint
  console.log('Testing /api/v1/auth/login with swanikhyd@gmail.com ...');
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'swanikhyd@gmail.com',
      password: 'Swanik@654774',
    }),
  });

  const loginJson = await loginRes.json();
  console.log('Login response status:', loginRes.status, loginJson);

  if (!loginJson.data?.requiresOtp && !loginJson.data?.requires2fa) {
    console.error('❌ Expected requiresOtp flag!');
    process.exit(1);
  }

  // 4. Retrieve OTP from email_verifications table
  const otpRecord = await prisma.emailVerification.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) {
    console.error('❌ No OTP record found in email_verifications!');
    process.exit(1);
  }
  console.log(`✅ Found OTP in database: ${otpRecord.code}`);

  // 5. Verify OTP
  console.log('Testing /api/v1/auth/2fa/verify ...');
  const verifyRes = await fetch('http://localhost:3000/api/v1/auth/2fa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: otpRecord.code,
      tempToken: loginJson.data.tempToken,
    }),
  });

  const verifyJson = await verifyRes.json();
  console.log('Verify response status:', verifyRes.status, verifyJson);

  if (verifyJson.data?.user?.role !== 'SUPER_ADMIN') {
    console.error('❌ Role mismatch in verify response:', verifyJson.data?.user?.role);
    process.exit(1);
  }

  console.log('\n🎉 ALL CHECKS PASSED: swanikhyd@gmail.com is fully configured as Super Admin with password Swanik@654774!\n');
}

run()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
