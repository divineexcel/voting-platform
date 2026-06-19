const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Helper to make HTTP requests and handle cookies
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    if (options.cookie) {
      reqOptions.headers['Cookie'] = options.cookie;
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        let body;
        try {
          body = data ? JSON.parse(data) : {};
        } catch (e) {
          body = { text: data };
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

function parseCookie(setCookieHeaders) {
  if (!setCookieHeaders) return null;
  const header = Array.isArray(setCookieHeaders) ? setCookieHeaders[0] : setCookieHeaders;
  const match = header.match(/^([^=]+=[^;]+)/);
  return match ? match[1] : null;
}

async function runTests() {
  console.log('--- STARTING SYSTEM INTEGRATION TESTS ---');
  let adminCookie = null;
  let studentCookie = null;
  let registrationCode = null;
  let headBoyPositionId = null;
  let applicationId = null;
  let candidateId = null;

  try {
    // 1. Verify connection
    console.log('1. Checking server status...');
    const serverCheck = await request(`${BASE_URL}/api/auth/me`);
    if (serverCheck.status !== 200) {
      throw new Error(`Server check failed with status ${serverCheck.status}`);
    }
    console.log('   [PASS] Server is up and responding.');

    // 2. Login as Admin
    console.log('2. Logging in as Admin...');
    const loginRes = await request(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: { username: 'admin', password: 'admin123' }
    });

    if (loginRes.status !== 200) {
      throw new Error(`Admin login failed: ${JSON.stringify(loginRes.body)}`);
    }
    adminCookie = parseCookie(loginRes.headers['set-cookie']);
    console.log('   [PASS] Logged in successfully. Session cookie received.');

    // 3. Generate Registration Code
    console.log('3. Generating registration code...');
    const codeGenRes = await request(`${BASE_URL}/api/admin/codes`, {
      method: 'POST',
      cookie: adminCookie,
      body: { count: 1 }
    });

    if (codeGenRes.status !== 200 || !codeGenRes.body.codes || codeGenRes.body.codes.length === 0) {
      throw new Error(`Failed to generate code: ${JSON.stringify(codeGenRes.body)}`);
    }
    registrationCode = codeGenRes.body.codes[0];
    console.log(`   [PASS] Generated voter code: ${registrationCode}`);

    // 4. Register a Student User
    console.log('4. Registering a student user using code...');
    const regRes = await request(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      body: {
        code: registrationCode,
        name: 'Student Tester',
        username: 'student.test',
        password: 'password123'
      }
    });

    if (regRes.status !== 200) {
      throw new Error(`Student registration failed: ${JSON.stringify(regRes.body)}`);
    }
    studentCookie = parseCookie(regRes.headers['set-cookie']);
    console.log('   [PASS] Student registered and logged in successfully.');

    // 5. Fetch positions and find Head Boy position ID
    console.log('5. Fetching available positions...');
    const posRes = await request(`${BASE_URL}/api/positions`, {
      cookie: studentCookie
    });

    if (posRes.status !== 200 || !posRes.body.positions) {
      throw new Error(`Failed to fetch positions: ${JSON.stringify(posRes.body)}`);
    }
    const headBoyPos = posRes.body.positions.find(p => p.name === 'Head Boy');
    if (!headBoyPos) {
      throw new Error('Head Boy position not found in database seeding.');
    }
    headBoyPositionId = headBoyPos.id;
    console.log(`   [PASS] Found Head Boy position with ID: ${headBoyPositionId}`);

    // 6. Submit contestant application
    console.log('6. Submitting contestant application...');
    const applyRes = await request(`${BASE_URL}/api/candidates/apply`, {
      method: 'POST',
      cookie: studentCookie,
      body: {
        positionId: headBoyPositionId,
        manifesto: 'I will be an exemplary Head Boy.'
      }
    });

    if (applyRes.status !== 200) {
      throw new Error(`Failed to submit application: ${JSON.stringify(applyRes.body)}`);
    }
    console.log('   [PASS] Candidacy application submitted.');

    // 7. Verify pending status
    console.log('7. Verifying application is pending...');
    const historyRes = await request(`${BASE_URL}/api/candidates/apply`, {
      cookie: studentCookie
    });

    if (historyRes.status !== 200 || historyRes.body.applications.length === 0) {
      throw new Error(`Failed to check application history: ${JSON.stringify(historyRes.body)}`);
    }
    const app = historyRes.body.applications[0];
    if (app.status !== 'pending') {
      throw new Error(`Application status was not pending. Status: ${app.status}`);
    }
    console.log('   [PASS] Checked application status. It is: "pending".');

    // 8. Admin reviews pending applications
    console.log('8. Admin fetching applications...');
    const adminAppsRes = await request(`${BASE_URL}/api/admin/candidates`, {
      cookie: adminCookie
    });

    if (adminAppsRes.status !== 200 || !adminAppsRes.body.candidates) {
      throw new Error(`Admin failed to fetch applications: ${JSON.stringify(adminAppsRes.body)}`);
    }
    const pendingApp = adminAppsRes.body.candidates.find(c => c.status === 'pending');
    if (!pendingApp) {
      throw new Error('No pending applications found in admin view.');
    }
    applicationId = pendingApp.id;
    console.log(`   [PASS] Found pending application ID: ${applicationId}`);

    // 9. Admin approves candidate
    console.log('9. Admin approving application...');
    const approveRes = await request(`${BASE_URL}/api/admin/candidates`, {
      method: 'POST',
      cookie: adminCookie,
      body: {
        id: applicationId,
        status: 'approved'
      }
    });

    if (approveRes.status !== 200) {
      throw new Error(`Failed to approve candidate: ${JSON.stringify(approveRes.body)}`);
    }
    console.log('   [PASS] Candidacy approved.');

    // 10. Verify approved status on student dashboard
    console.log('10. Student checking application status...');
    const historyRes2 = await request(`${BASE_URL}/api/candidates/apply`, {
      cookie: studentCookie
    });
    const app2 = historyRes2.body.applications[0];
    if (app2.status !== 'approved') {
      throw new Error(`Candidacy was not approved. Status: ${app2.status}`);
    }
    console.log('    [PASS] Verified candidacy status. It is now: "approved".');

    // 11. Student fetches positions to get approved candidate ID
    console.log('11. Retrieving candidate ID for voting...');
    const posRes2 = await request(`${BASE_URL}/api/positions`, {
      cookie: studentCookie
    });
    const headBoyPosUpdated = posRes2.body.positions.find(p => p.id === headBoyPositionId);
    if (!headBoyPosUpdated || headBoyPosUpdated.candidates.length === 0) {
      throw new Error('Approved candidate not showing in positions list.');
    }
    candidateId = headBoyPosUpdated.candidates[0].id;
    console.log(`    [PASS] Approved candidate ID: ${candidateId} (Name: ${headBoyPosUpdated.candidates[0].name})`);

    // 12. Student casts vote
    console.log('12. Student casting vote...');
    const voteRes = await request(`${BASE_URL}/api/votes/cast`, {
      method: 'POST',
      cookie: studentCookie,
      body: {
        positionId: headBoyPositionId,
        candidateId: candidateId
      }
    });

    if (voteRes.status !== 200) {
      throw new Error(`Failed to cast vote: ${JSON.stringify(voteRes.body)}`);
    }
    console.log('    [PASS] Vote cast successfully.');

    // 13. Student attempts duplicate vote
    console.log('13. Verifying double voting prevention...');
    const duplicateVoteRes = await request(`${BASE_URL}/api/votes/cast`, {
      method: 'POST',
      cookie: studentCookie,
      body: {
        positionId: headBoyPositionId,
        candidateId: candidateId
      }
    });

    if (duplicateVoteRes.status === 200) {
      throw new Error('Double voting allowed! This is a critical bug.');
    }
    console.log(`    [PASS] Double voting blocked correctly (Status: ${duplicateVoteRes.status}, Error: ${duplicateVoteRes.body.error}).`);

    // 14. Admin reviews results
    console.log('14. Admin reviewing election results...');
    const resultsRes = await request(`${BASE_URL}/api/admin/results`, {
      cookie: adminCookie
    });

    if (resultsRes.status !== 200 || !resultsRes.body.stats) {
      throw new Error(`Failed to retrieve results: ${JSON.stringify(resultsRes.body)}`);
    }
    const { stats, results } = resultsRes.body;
    console.log('    Stats received:', stats);
    
    if (stats.totalVotesCast !== 1) {
      throw new Error(`Expected totalVotesCast to be 1, got ${stats.totalVotesCast}`);
    }

    const headBoyResult = results.find(r => r.id === headBoyPositionId);
    if (!headBoyResult || headBoyResult.totalVotes !== 1 || headBoyResult.candidates[0].vote_count !== 1) {
      throw new Error('Election results did not properly update vote count for candidate.');
    }
    console.log('    [PASS] Election statistics and results updated correctly.');

    console.log('\n=============================================');
    console.log('🎉 ALL SYSTEM INTEGRATION TESTS PASSED!');
    console.log('=============================================');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ INTEGRATION TEST FAILED:', error.message);
    process.exit(1);
  }
}

// Introduce short delay to let Next.js spin up completely
setTimeout(runTests, 1000);
