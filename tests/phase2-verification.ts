async function runPhase2Verification() {
  const baseUrl = 'http://localhost:3000';
  console.log('🚀 Starting Phase 2 Verification Test Suite...\n');

  function extractCookies(res: Response): string {
    if (typeof (res.headers as any).getSetCookie === 'function') {
      const list: string[] = (res.headers as any).getSetCookie();
      return list.map((c) => c.split(';')[0]).join('; ');
    }
    return res.headers.get('set-cookie') || '';
  }

  // Helper for logins
  async function loginAndGetCookies(email: string, password: string): Promise<string> {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (data.data?.requires2fa) {
      // Complete email OTP
      const verifyRes = await fetch(`${baseUrl}/api/v1/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: data.data.devOtp,
          tempToken: data.data.tempToken,
        }),
      });
      return extractCookies(verifyRes);
    }

    return extractCookies(res);
  }

  // 1. Admin login with requested credentials (sri654774@gmail.com / Hello1029)
  console.log('1. Authenticating Admin (sri654774@gmail.com)...');
  const adminCookie = await loginAndGetCookies('sri654774@gmail.com', 'Hello1029');
  if (!adminCookie) throw new Error('Admin login failed');
  console.log('✅ Admin authenticated with secure cookies.\n');

  // 2. Editor login (editor@gmail.com / TellmeBro@2026!)
  console.log('2. Authenticating Editor (editor@gmail.com)...');
  const editorCookie = await loginAndGetCookies('editor@gmail.com', 'TellmeBro@2026!');
  if (!editorCookie) throw new Error('Editor login failed');
  console.log('✅ Editor authenticated with secure cookies.\n');

  // 3. Category CRUD test
  console.log('3. Testing Category Management...');
  const catCreateRes = await fetch(`${baseUrl}/api/v1/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      name: 'Startups & Tech',
      description: 'Local technology incubators, startup pitches, and founder stories',
      displayOrder: 10,
    }),
  });
  const catCreateData = await catCreateRes.json();
  if (catCreateRes.status !== 201 || !catCreateData.data?.category) {
    throw new Error(`Failed to create category: ${JSON.stringify(catCreateData)}`);
  }
  const testCatId = catCreateData.data.category.id;
  console.log(`✅ Category created: "${catCreateData.data.category.name}" (ID: ${testCatId})\n`);

  // 4. URL Platform Detection
  console.log('4. Testing Social Media URL Detection...');
  const detectRes = await fetch(`${baseUrl}/api/v1/posts/detect-url?url=${encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}`);
  const detectData = await detectRes.json();
  if (!detectData.success || detectData.data.platform !== 'YOUTUBE') {
    throw new Error('URL detection failed for YouTube video');
  }
  console.log(`✅ URL Detected: Platform=${detectData.data.platform}, ContentType=${detectData.data.contentType}, EmbedUrl=${detectData.data.embedUrl}\n`);

  // 5. Editor creates a post (should be routed to PENDING)
  console.log('5. Testing Editor Post Curation...');
  const postCreateRes = await fetch(`${baseUrl}/api/v1/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: editorCookie },
    body: JSON.stringify({
      title: 'Top 5 Tech Startups Emerging in Hyderabad 2026',
      description: 'A deep dive into local AI and robotics startups shaping the future.',
      originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      categoryIds: [testCatId],
      tags: ['startups', 'hyderabad', 'ai'],
      priority: 'PRIORITY',
      sourceAttr: '@HyderabadInnovates',
      locations: [{ city: 'Hyderabad', state: 'Telangana', isAllLocations: false }],
    }),
  });
  const postCreateData = await postCreateRes.json();
  if (postCreateRes.status !== 201 || !postCreateData.data?.post) {
    throw new Error(`Failed to create post: ${JSON.stringify(postCreateData)}`);
  }
  const createdPost = postCreateData.data.post;
  console.log(`✅ Post created by Editor in status: "${createdPost.status}" (ID: ${createdPost.id})\n`);

  // 6. Admin inspects pending review queue
  console.log('6. Testing Admin Content Review Queue...');
  const pendingRes = await fetch(`${baseUrl}/api/v1/posts/pending`, {
    headers: { Cookie: adminCookie },
  });
  const pendingData = await pendingRes.json();
  const foundPending = pendingData.data?.queue?.some((p: any) => p.id === createdPost.id);
  if (!foundPending) throw new Error('Submitted post not found in pending review queue');
  console.log(`✅ Found post in Admin Review Queue (Queue size: ${pendingData.data.count})\n`);

  // 7. Admin rejects with feedback
  console.log('7. Testing Editorial Rejection with Required Feedback...');
  const rejectRes = await fetch(`${baseUrl}/api/v1/posts/${createdPost.id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ reason: 'Please add mention of the founder incubation program.' }),
  });
  const rejectData = await rejectRes.json();
  if (rejectRes.status !== 200 || rejectData.data.post.status !== 'REJECTED') {
    throw new Error('Rejection failed');
  }
  console.log(`✅ Post rejected with note: "${rejectData.data.approval.reason}"\n`);

  // 8. Editor resubmits post
  console.log('8. Testing Editor Resubmission after Feedback...');
  const submitRes = await fetch(`${baseUrl}/api/v1/posts/${createdPost.id}/submit`, {
    method: 'POST',
    headers: { Cookie: editorCookie },
  });
  const submitData = await submitRes.json();
  if (submitRes.status !== 200 || submitData.data.post.status !== 'PENDING') {
    throw new Error('Resubmission failed');
  }
  console.log(`✅ Post resubmitted to status: "${submitData.data.post.status}"\n`);

  // 9. Admin approves post with Priority boost
  console.log('9. Testing Admin Final Approval with Priority Promotion...');
  const approveRes = await fetch(`${baseUrl}/api/v1/posts/${createdPost.id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ priority: 'PRIORITY', note: 'Looks great now!' }),
  });
  const approveData = await approveRes.json();
  if (approveRes.status !== 200 || approveData.data.post.status !== 'PUBLISHED') {
    throw new Error('Approval failed');
  }
  console.log(`✅ Post approved & published! Status: "${approveData.data.post.status}", Priority: "${approveData.data.post.priority}"\n`);

  // 10. Public Feed & Filters verification
  console.log('10. Testing Public Feed & Filter queries...');
  const feedRes = await fetch(`${baseUrl}/api/v1/posts?category=${testCatId}`);
  const feedData = await feedRes.json();
  if (feedRes.status !== 200 || feedData.data.posts.length === 0) {
    throw new Error('Published post not appearing in public category feed');
  }
  console.log(`✅ Post successfully surfaced on public feed (Found: ${feedData.data.posts.length} posts)\n`);

  // 11. User Interactions: Like & Save Toggle
  console.log('11. Testing User Interactions (Like & Save)...');
  const likeRes = await fetch(`${baseUrl}/api/v1/posts/${createdPost.id}/like`, {
    method: 'POST',
    headers: { Cookie: editorCookie },
  });
  const likeData = await likeRes.json();
  if (!likeData.data.isLiked || likeData.data.likeCount < 1) {
    throw new Error('Like toggle failed');
  }
  console.log(`✅ Like toggled: isLiked=${likeData.data.isLiked}, count=${likeData.data.likeCount}`);

  const saveRes = await fetch(`${baseUrl}/api/v1/posts/${createdPost.id}/save`, {
    method: 'POST',
    headers: { Cookie: editorCookie },
  });
  const saveData = await saveRes.json();
  if (!saveData.data.isSaved || saveData.data.saveCount < 1) {
    throw new Error('Save toggle failed');
  }
  console.log(`✅ Save toggled: isSaved=${saveData.data.isSaved}, count=${saveData.data.saveCount}\n`);

  // 12. User Report Submission
  console.log('12. Testing Content Reporting...');
  const reportRes = await fetch(`${baseUrl}/api/v1/posts/${createdPost.id}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: editorCookie },
    body: JSON.stringify({
      reason: 'MISLEADING',
      details: 'Automated test report verification',
    }),
  });
  const reportData = await reportRes.json();
  if (reportRes.status !== 201 || !reportData.data.reportId) {
    throw new Error('Report submission failed');
  }
  console.log(`✅ Content report filed with ID: ${reportData.data.reportId}\n`);

  console.log('═══════════════════════════════════════════════════');
  console.log('🎉 ALL 12 PHASE 2 VERIFICATION TESTS PASSED 100%!');
  console.log('═══════════════════════════════════════════════════\n');
}

runPhase2Verification().catch((err) => {
  console.error('❌ Phase 2 Verification Failed:', err);
  process.exit(1);
});
