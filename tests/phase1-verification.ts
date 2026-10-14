// Tellme Bro — Phase 1 Automated End-to-End Verification Suite

async function runTests() {
  const BASE_URL = 'http://localhost:3000';
  console.log('🧪 Starting Phase 1 Verification Suite against ' + BASE_URL + '...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // ── TEST 1: Email Domain Whitelist Enforcement ──
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker User',
        email: 'user@unalloweddomain.xyz',
        password: 'Password123!',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.success === false,
      'Domain Whitelist: Rejects unallowed email domain (unalloweddomain.xyz)',
      JSON.stringify(data)
    );
  } catch (e: any) {
    assert(false, 'Domain Whitelist test threw exception', e.message);
  }

  // ── TEST 2: Password Complexity Enforcement ──
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Weak Pass',
        email: 'weakpass@gmail.com',
        password: 'password', // no uppercase, no numbers, no special chars
      }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.success === false,
      'Password Security: Rejects weak passwords without uppercase/numbers/symbols',
      JSON.stringify(data)
    );
  } catch (e: any) {
    assert(false, 'Password complexity test threw exception', e.message);
  }

  // ── TEST 3: Valid Registration & OTP Flow ──
  let testEmail = `newcurator_${Date.now()}@gmail.com`;
  let otpCode = '';
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Test Curator',
        email: testEmail,
        password: 'TellmeBro@2026!',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 201 && data.success === true && data.data?.requiresVerification === true,
      'User Registration: Successful signup with allowed domain (gmail.com)',
      JSON.stringify(data)
    );
    otpCode = data.data?.devOtp;
  } catch (e: any) {
    assert(false, 'User registration threw exception', e.message);
  }

  // ── TEST 4: OTP Verification & Cookie Session Issuance ──
  let userCookies = '';
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: otpCode,
      }),
    });
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie');
    userCookies = setCookie || '';
    assert(
      res.status === 200 && data.success === true && data.data?.user?.emailVerified === true,
      'Email OTP Activation: 6-digit OTP activates account and issues tokens',
      JSON.stringify(data)
    );
  } catch (e: any) {
    assert(false, 'OTP verification threw exception', e.message);
  }

  // ── TEST 5: RBAC Boundary: Standard User Cannot Access Admin API ──
  try {
    const res = await fetch(`${BASE_URL}/api/v1/admin/dashboard`, {
      headers: { Cookie: userCookies },
    });
    const data = await res.json();
    assert(
      res.status === 403 && data.success === false,
      'RBAC Boundary: Standard User cannot access /api/v1/admin/dashboard (403 Forbidden)',
      JSON.stringify(data)
    );
  } catch (e: any) {
    assert(false, 'RBAC User boundary test threw exception', e.message);
  }

  // ── TEST 6: Admin Login & Dashboard Access ──
  let adminCookies = '';
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'TellmeBro@2026!',
      }),
    });
    const data = await res.json();
    adminCookies = res.headers.get('set-cookie') || '';
    assert(
      res.status === 200 && data.success === true && data.data?.user?.role === 'ADMIN',
      'Admin Login: Authenticates as Platform Admin and issues cookies',
      JSON.stringify(data)
    );
  } catch (e: any) {
    assert(false, 'Admin login test threw exception', e.message);
  }

  // ── TEST 7: Admin Dashboard Telemetry Access ──
  try {
    const res = await fetch(`${BASE_URL}/api/v1/admin/dashboard`, {
      headers: { Cookie: adminCookies },
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.success === true && data.data?.stats?.totalUsers >= 4,
      'Admin Telemetry: Admin can view real-time platform statistics & categories',
      JSON.stringify(data)
    );
  } catch (e: any) {
    assert(false, 'Admin telemetry test threw exception', e.message);
  }

  // ── TEST 8: RBAC Prevention: Admin Cannot Create a Second Super Admin ──
  try {
    // Attempt to promote test user to SUPER_ADMIN
    const listRes = await fetch(`${BASE_URL}/api/v1/admin/users?search=${testEmail}`, {
      headers: { Cookie: adminCookies },
    });
    const listData = await listRes.json();
    const testUserId = listData.data?.users?.[0]?.id;

    const res = await fetch(`${BASE_URL}/api/v1/admin/users/${testUserId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookies },
      body: JSON.stringify({ role: 'SUPER_ADMIN' }),
    });
    const data = await res.json();
    assert(
      res.status === 403 && data.success === false,
      'RBAC Rule: Prevention of creating second Super Admin via API (403 Forbidden)',
      JSON.stringify(data)
    );
  } catch (e: any) {
    assert(false, 'Super admin creation prevention test threw exception', e.message);
  }

  // ── TEST 9: Admin Role Promotion to Editor & Audit Logging ──
  try {
    const listRes = await fetch(`${BASE_URL}/api/v1/admin/users?search=${testEmail}`, {
      headers: { Cookie: adminCookies },
    });
    const listData = await listRes.json();
    const testUserId = listData.data?.users?.[0]?.id;

    const res = await fetch(`${BASE_URL}/api/v1/admin/users/${testUserId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookies },
      body: JSON.stringify({ role: 'EDITOR' }),
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.data?.user?.role === 'EDITOR',
      'Role Promotion: Admin elevates User to EDITOR role',
      JSON.stringify(data)
    );

    // Verify audit log entry
    const auditRes = await fetch(`${BASE_URL}/api/v1/admin/audit-logs?limit=5`, {
      headers: { Cookie: adminCookies },
    });
    const auditData = await auditRes.json();
    const roleLog = auditData.data?.logs?.find((l: any) => l.action === 'USER_ROLE_CHANGED');
    assert(
      !!roleLog,
      'Audit Trail: Role modification recorded in immutable audit log table'
    );
  } catch (e: any) {
    assert(false, 'Role promotion test threw exception', e.message);
  }

  // ── TEST 10: Super Admin 2FA Requirement Check ──
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@gmail.com',
        password: 'TellmeBro@2026!',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 200 && (data.data?.requires2faSetup === true || data.data?.requires2fa === true),
      'Super Admin 2FA: Mandatory Two-Factor Authentication enforced on Super Admin login',
      JSON.stringify(data)
    );
  } catch (e: any) {
    assert(false, 'Super Admin 2FA test threw exception', e.message);
  }

  console.log('\n────────────────────────────────────────');
  console.log(`Phase 1 Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log('────────────────────────────────────────\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
