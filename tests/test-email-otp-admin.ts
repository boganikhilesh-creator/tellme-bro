async function runTest() {
  const baseUrl = 'http://localhost:3000';
  console.log('🧪 Testing Email-based OTP login for sri654774@gmail.com / Hello1029...');

  // 1. Submit login credentials
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sri654774@gmail.com',
      password: 'Hello1029',
    }),
  });

  const loginData = await loginRes.json();
  console.log('Login Response Status:', loginRes.status);
  console.log('Login Response Data:', loginData);

  if (!loginData.data?.requires2fa || !loginData.data?.tempToken) {
    throw new Error('Expected requires2fa: true with tempToken');
  }

  const { tempToken, devOtp } = loginData.data;
  console.log(`✅ Step 1 Passed: 2FA required. Generated Dev OTP is: ${devOtp}`);

  // 2. Test invalid OTP code
  const invalidRes = await fetch(`${baseUrl}/api/v1/auth/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: '000000',
      tempToken,
    }),
  });
  const invalidData = await invalidRes.json();
  console.log('Invalid Code Response (should fail):', invalidRes.status, invalidData.error?.message);
  if (invalidRes.status !== 400) {
    throw new Error('Expected status 400 for invalid OTP code');
  }
  console.log('✅ Step 2 Passed: Invalid OTP properly rejected.');

  // 3. Test valid OTP verification
  const verifyRes = await fetch(`${baseUrl}/api/v1/auth/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: devOtp,
      tempToken,
    }),
  });
  const verifyData = await verifyRes.json();
  const setCookie = verifyRes.headers.get('set-cookie');
  console.log('Verify Status:', verifyRes.status);
  console.log('Verify Data:', verifyData);
  console.log('Set-Cookie Header exists:', !!setCookie);

  if (verifyRes.status !== 200 || !verifyData.data?.user) {
    throw new Error('Verification failed');
  }

  if (verifyData.data.user.email !== 'sri654774@gmail.com' || verifyData.data.user.role !== 'SUPER_ADMIN') {
    throw new Error('Unexpected user payload returned');
  }

  console.log('✅ Step 3 Passed: Email OTP verified successfully, session issued for Sri Admin!');

  // 4. Test Resend OTP route
  // Let's do another login to test resend
  const login2Res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sri654774@gmail.com',
      password: 'Hello1029',
    }),
  });
  const login2Data = await login2Res.json();
  const resendRes = await fetch(`${baseUrl}/api/v1/auth/2fa/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempToken: login2Data.data.tempToken }),
  });
  const resendData = await resendRes.json();
  console.log('Resend Status:', resendRes.status, resendData);
  if (resendRes.status !== 200) {
    throw new Error('Resend OTP failed');
  }
  console.log('✅ Step 4 Passed: Resend OTP generates new code and sends email.');

  console.log('\n🎉 ALL EMAIL OTP TESTS PASSED CLEANLY!\n');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
