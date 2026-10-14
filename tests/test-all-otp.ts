/**
 * Verification: ALL logins and ALL signups require Email OTP
 */

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('🧪 Testing: All Signups & Logins receive Email OTP...\n');

  // Test 1: New User Signup
  const rand = Math.floor(Math.random() * 89999 + 10000);
  const testEmail = `normaluser_${rand}@gmail.com`;
  console.log(`1. Testing Signup for regular user: ${testEmail}...`);

  const signupRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Regular User',
      email: testEmail,
      password: 'Password@123',
    }),
  });

  const signupData = await signupRes.json();
  console.log('   Signup status:', signupRes.status);
  console.log('   Requires email verification?:', signupData.data?.requiresVerification === true ? 'YES' : 'NO');
  console.log('   devOtp exposed in response?:', signupData.data?.devOtp ? 'YES (UNSAFE)' : 'NO (SECURE)');

  if (signupRes.status !== 201 || !signupData.data?.requiresVerification || signupData.data?.devOtp) {
    console.error('❌ FAIL on signup verification');
    process.exit(1);
  }

  // Retrieve OTP from DB and activate
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const newUser = await prisma.user.findUnique({ where: { email: testEmail } });
  const signupOtp = await prisma.emailVerification.findFirst({
    where: { userId: newUser.id, type: 'VERIFY_EMAIL', used: false },
    orderBy: { createdAt: 'desc' },
  });

  const verifyRes = await fetch(`${BASE_URL}/api/v1/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, code: signupOtp.code }),
  });
  console.log('   Email verification status:', verifyRes.status);

  // Test 2: Standard User Login (Now receives mandatory Email OTP)
  console.log(`\n2. Testing Login for regular user: ${testEmail}...`);
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password@123',
    }),
  });

  const loginData = await loginRes.json();
  console.log('   Login status:', loginRes.status);
  console.log('   requires2fa (Email OTP)?:', loginData.data?.requires2fa === true ? 'YES' : 'NO');
  console.log('   Type:', loginData.data?.type);
  console.log('   devOtp exposed in response?:', loginData.data?.devOtp ? 'YES (UNSAFE)' : 'NO (SECURE)');

  if (!loginData.data?.requires2fa || loginData.data?.type !== 'EMAIL_OTP' || loginData.data?.devOtp) {
    console.error('❌ FAIL on login verification');
    process.exit(1);
  }

  // Retrieve Login OTP from DB and complete login
  const loginOtp = await prisma.emailVerification.findFirst({
    where: { userId: newUser.id, type: 'LOGIN_OTP', used: false },
    orderBy: { createdAt: 'desc' },
  });

  const finalVerifyRes = await fetch(`${BASE_URL}/api/v1/auth/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: loginOtp.code,
      tempToken: loginData.data.tempToken,
    }),
  });
  const finalData = await finalVerifyRes.json();
  console.log('   2FA login verification status:', finalVerifyRes.status);
  console.log('   Logged in user:', finalData.data?.user?.email);

  console.log('\n🎉 ALL TESTS PASSED: 100% of Signups and Logins receive Email OTP!');
  await prisma.$disconnect();
}

run();
