/**
 * Test: OTP is hidden from client and strictly validated against DB
 */

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('🧪 Testing Hidden OTP & Strict Email Verification...\n');

  // 1. Submit login credentials for sri654774@gmail.com
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sri654774@gmail.com',
      password: 'Hello1029',
    }),
  });

  const loginData = await loginRes.json();
  console.log('1. Login response received:');
  console.log('   requires2fa:', loginData.data?.requires2fa);
  console.log('   devOtp exposed in response?:', loginData.data?.devOtp !== undefined ? 'YES (UNSAFE)' : 'NO (SECURE)');

  if (loginData.data?.devOtp !== undefined) {
    console.error('❌ FAIL: devOtp should not be exposed in login response!');
    process.exit(1);
  } else {
    console.log('✅ PASS: OTP is strictly hidden from client response.');
  }

  const tempToken = loginData.data?.tempToken;
  if (!tempToken) {
    console.error('❌ FAIL: No tempToken received.');
    process.exit(1);
  }

  // 2. Test submitting an INCORRECT code
  console.log('\n2. Testing incorrect OTP (000000)...');
  const wrongVerifyRes = await fetch(`${BASE_URL}/api/v1/auth/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: '000000',
      tempToken,
    }),
  });

  const wrongData = await wrongVerifyRes.json();
  if (wrongVerifyRes.status === 400 && wrongData.error?.code === 'INVALID_CODE') {
    console.log('✅ PASS: Incorrect OTP correctly rejected (400 INVALID_CODE).');
  } else {
    console.error('❌ FAIL: Incorrect OTP was not rejected properly:', wrongData);
    process.exit(1);
  }

  // 3. Retrieve the sent OTP directly from database (simulating checking email inbox)
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({ where: { email: 'sri654774@gmail.com' } });
  const sentOtp = await prisma.emailVerification.findFirst({
    where: { userId: user.id, type: 'LOGIN_OTP', used: false },
    orderBy: { createdAt: 'desc' },
  });

  console.log('\n3. Simulating user checking email and entering correct OTP...');
  console.log(`   (Dispatched OTP code: ${sentOtp?.code})`);

  // 4. Test submitting the CORRECT code
  const correctVerifyRes = await fetch(`${BASE_URL}/api/v1/auth/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: sentOtp?.code,
      tempToken,
    }),
  });

  const correctData = await correctVerifyRes.json();
  if (correctVerifyRes.status === 200 && correctData.data?.user?.role === 'SUPER_ADMIN') {
    console.log('✅ PASS: Correct OTP verified successfully! Role is SUPER_ADMIN.');
  } else {
    console.error('❌ FAIL: Correct OTP was not accepted:', correctData);
    process.exit(1);
  }

  console.log('\n🎉 ALL TESTS PASSED: OTP is hidden from UI/client and accurately verified!');
  await prisma.$disconnect();
}

run();
