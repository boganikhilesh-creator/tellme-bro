/**
 * Automated Verification: Google Sign-In Nickname Onboarding & Database Persistence
 */

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('🧪 Starting Google Sign-In & Nickname Persistence Verification...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${desc}`);
      process.exitCode = 1;
    }
  }

  try {
    // 1. Simulate Google Sign-In for a fresh user
    const testEmail = `google_test_${Date.now()}@gmail.com`;
    const testName = 'Google Test User';
    const testNickname = `coolbro_${Math.floor(Math.random() * 8999 + 1000)}`;

    console.log(`1. Simulating Google Sign-In for: ${testEmail}...`);
    const googleRes = await fetch(
      `${BASE_URL}/api/v1/auth/oauth/google?action=demo&email=${encodeURIComponent(testEmail)}&name=${encodeURIComponent(testName)}`,
      { redirect: 'manual' }
    );

    assert(
      googleRes.status === 307 || googleRes.status === 302,
      `Google OAuth redirect returned status ${googleRes.status}`
    );

    const redirectLocation = googleRes.headers.get('location');
    assert(
      redirectLocation?.includes('/onboarding/nickname') || false,
      `New Google user is redirected to /onboarding/nickname (Got: ${redirectLocation})`
    );

    // Extract auth cookies
    const cookieHeaders = googleRes.headers.getSetCookie?.() || [];
    const cookieStr = cookieHeaders.map((c) => c.split(';')[0]).join('; ');
    assert(cookieStr.includes('access_token'), 'Access token cookie received');

    // 2. Check nickname availability check API
    console.log('\n2. Testing Nickname Check API...');
    const checkRes = await fetch(`${BASE_URL}/api/v1/auth/nickname?check=${testNickname}`, {
      headers: { Cookie: cookieStr },
    });
    const checkData = await checkRes.json();
    assert(checkRes.status === 200, 'Nickname check API returned 200');
    assert(checkData.data?.available === true, 'Test nickname is available');

    // 3. Test Invalid Nickname Format
    console.log('\n3. Testing Nickname Validation Rules...');
    const invalidRes = await fetch(`${BASE_URL}/api/v1/auth/nickname`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieStr,
      },
      body: JSON.stringify({ nickname: 'a!' }), // Invalid chars & too short
    });
    assert(invalidRes.status === 400, 'Invalid nickname rejected with 400 Bad Request');

    // 4. Save Valid Nickname to Database
    console.log('\n4. Submitting Valid Nickname...');
    const saveRes = await fetch(`${BASE_URL}/api/v1/auth/nickname`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieStr,
      },
      body: JSON.stringify({ nickname: testNickname }),
    });
    const saveData = await saveRes.json();
    assert(saveRes.status === 200, `Nickname saved successfully (200 OK)`);
    assert(saveData.data?.user?.nickname === testNickname, `Saved user object has nickname @${testNickname}`);

    // 5. Verify Database Retrieval via /api/v1/auth/me
    console.log('\n5. Verifying Database Retrieval via /api/v1/auth/me...');
    const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Cookie: cookieStr },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'Auth /me returned 200');
    assert(
      meData.data?.user?.nickname === testNickname,
      `Profile loaded from DB has nickname: @${meData.data?.user?.nickname}`
    );
    assert(
      meData.data?.user?.preferences?.onboarded === true,
      'User preference marked onboarded in database'
    );

    // 6. Test Duplicate Nickname Rejection
    console.log('\n6. Testing Duplicate Nickname Constraint...');
    // Create another user
    const otherEmail = `google_other_${Date.now()}@gmail.com`;
    const otherGoogleRes = await fetch(
      `${BASE_URL}/api/v1/auth/oauth/google?action=demo&email=${encodeURIComponent(otherEmail)}&name=Other`,
      { redirect: 'manual' }
    );
    const otherCookies = (otherGoogleRes.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
    const dupRes = await fetch(`${BASE_URL}/api/v1/auth/nickname`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: otherCookies,
      },
      body: JSON.stringify({ nickname: testNickname }), // Try to take the same nickname
    });
    assert(dupRes.status === 409, 'Duplicate nickname rejected with 409 Conflict');

    // 7. Test Subsequent Sign-In (Should redirect directly to /home since nickname is set)
    console.log('\n7. Testing Subsequent Google Sign-In...');
    const returningGoogleRes = await fetch(
      `${BASE_URL}/api/v1/auth/oauth/google?action=demo&email=${encodeURIComponent(testEmail)}&name=${encodeURIComponent(testName)}`,
      { redirect: 'manual' }
    );
    const returningLocation = returningGoogleRes.headers.get('location');
    assert(
      returningLocation?.includes('/home') || false,
      `User with existing nickname redirects directly to /home (Got: ${returningLocation})`
    );

    console.log(`\n=========================================`);
    console.log(`🎉 VERIFICATION COMPLETED: ${passed}/${total} TESTS PASSED`);
    console.log(`=========================================`);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exitCode = 1;
  }
}

run();
