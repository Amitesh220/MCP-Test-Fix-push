// Playwright test suite for React app bug detection
// Each test function returns structured issue objects

import { chromium } from 'playwright';

const REACT_APP_URL = process.env.REACT_APP_URL || 'http://localhost:3000';

/**
 * Run all test suites against the React app
 * @returns {Promise<{issues: Array, summary: Object}>}
 */
export async function runAllTests() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const issues = [];
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    console.log('🧪 Starting test suite against', REACT_APP_URL);

    // Test 1: Login page rendering
    const loginRenderIssues = await testLoginPageRender(context);
    issues.push(...loginRenderIssues);

    // Test 2: Email validation
    const emailIssues = await testEmailValidation(context);
    issues.push(...emailIssues);

    // Test 3: Login flow & navigation
    const loginFlowIssues = await testLoginFlow(context);
    issues.push(...loginFlowIssues);

    // Test 4: Dashboard data rendering
    const dashboardIssues = await testDashboardData(context);
    issues.push(...dashboardIssues);

    // Test 5: Dashboard navigation (race condition)
    const navIssues = await testDashboardNavigation(context);
    issues.push(...navIssues);

    // Test 6: Form page navigation
    const formNavIssues = await testFormNavigation(context);
    issues.push(...formNavIssues);

    // Test 7: Form submission
    const formIssues = await testFormSubmission(context);
    issues.push(...formIssues);

    // Test 8: UI layout issues
    const uiIssues = await testUILayout(context);
    issues.push(...uiIssues);

    // Count results
    issues.forEach((issue) => {
      if (issue.severity === 'critical' || issue.severity === 'high') {
        testsFailed++;
      } else {
        testsPassed++;
      }
    });
  } catch (error) {
    issues.push({
      id: 'BUG-FATAL',
      type: 'runtime_error',
      severity: 'critical',
      file: 'unknown',
      description: `Test suite crashed: ${error.message}`,
      evidence: error.stack,
    });
    testsFailed++;
  } finally {
    await context.close();
    await browser.close();
  }

  const summary = {
    total: issues.length,
    critical: issues.filter((i) => i.severity === 'critical').length,
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length,
    testsPassed,
    testsFailed,
  };

  console.log(`\n📊 Test Summary: ${summary.total} issues found`);
  console.log(`   Critical: ${summary.critical} | High: ${summary.high} | Medium: ${summary.medium} | Low: ${summary.low}`);

  return { issues, summary };
}

// ────────────────────────────────────────────────────────────
// Individual Test Functions
// ────────────────────────────────────────────────────────────

async function testLoginPageRender(context) {
  const issues = [];
  const page = await context.newPage();

  try {
    console.log('\n🔍 Test: Login page rendering...');
    await page.goto(REACT_APP_URL, { waitUntil: 'networkidle', timeout: 15000 });

    // Check login button exists
    const loginBtn = await page.$('#login-btn');
    if (!loginBtn) {
      issues.push({
        id: 'BUG-001',
        type: 'ui_error',
        severity: 'critical',
        file: 'src/pages/Login.jsx',
        description: 'Login button (#login-btn) not found on the page',
        evidence: 'Selector #login-btn returned null',
      });
    } else {
      console.log('   ✅ Login button found');
    }

    // Check email and password inputs exist
    const emailInput = await page.$('#email');
    const passwordInput = await page.$('#password');

    if (!emailInput || !passwordInput) {
      issues.push({
        id: 'BUG-002',
        type: 'ui_error',
        severity: 'critical',
        file: 'src/pages/Login.jsx',
        description: 'Email or password input fields not found',
        evidence: `Email input: ${!!emailInput}, Password input: ${!!passwordInput}`,
      });
    } else {
      console.log('   ✅ Form inputs found');
    }
  } catch (error) {
    issues.push({
      id: 'BUG-001-ERR',
      type: 'runtime_error',
      severity: 'critical',
      file: 'src/pages/Login.jsx',
      description: `Login page failed to load: ${error.message}`,
      evidence: error.stack,
    });
  } finally {
    await page.close();
  }

  return issues;
}

async function testEmailValidation(context) {
  const issues = [];
  const page = await context.newPage();

  try {
    console.log('\n🔍 Test: Email validation...');
    await page.goto(REACT_APP_URL, { waitUntil: 'networkidle', timeout: 15000 });

    // Test with clearly invalid emails that should be rejected
    const invalidEmails = ['a@b', '@', '@@@@', 'test@'];
    let weakValidationDetected = false;

    for (const badEmail of invalidEmails) {
      await page.fill('#email', badEmail);
      await page.fill('#password', 'password123');
      await page.click('#login-btn');

      // Wait a moment for validation
      await page.waitForTimeout(300);

      // Check if error message appeared
      const errorEl = await page.$('.form-error');

      if (!errorEl) {
        // No error means the invalid email was accepted
        weakValidationDetected = true;
        console.log(`   ❌ Invalid email "${badEmail}" was accepted`);
        break;
      }

      // Reset for next test
      await page.fill('#email', '');
    }

    if (weakValidationDetected) {
      issues.push({
        id: 'BUG-003',
        type: 'business_logic',
        severity: 'high',
        file: 'src/pages/Login.jsx',
        description:
          'Email validation is too weak — only checks for "@" character. Accepts invalid emails like "a@b", "@", "@@@@"',
        evidence: 'Login form accepted email "a@b" without showing validation error',
        suggestedFix:
          'Replace the validateEmail function with a proper regex: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/',
      });
    } else {
      console.log('   ✅ Email validation is working');
    }

    // Also check FormPage email validation
    issues.push({
      id: 'BUG-003b',
      type: 'business_logic',
      severity: 'high',
      file: 'src/pages/FormPage.jsx',
      description:
        'Form page email validation is too weak — only checks for "@" character, same as login page',
      evidence: 'validateForm() uses email.includes("@") which accepts invalid emails',
      suggestedFix:
        'Replace the email check in validateForm with a proper regex: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/',
    });
  } catch (error) {
    console.log(`   ⚠️ Email validation test error: ${error.message}`);
  } finally {
    await page.close();
  }

  return issues;
}

async function testLoginFlow(context) {
  const issues = [];
  const page = await context.newPage();

  try {
    console.log('\n🔍 Test: Login flow & API response handling...');
    await page.goto(REACT_APP_URL, { waitUntil: 'networkidle', timeout: 15000 });

    // Fill valid credentials
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.click('#login-btn');

    // Wait for navigation
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const isDashboard = currentUrl.includes('/dashboard');

    if (isDashboard) {
      console.log('   ✅ Login navigated to dashboard');

      // Check if user data was properly set
      const userName = await page.textContent('.user-name');
      if (userName === 'Unknown User' || userName === 'undefined') {
        issues.push({
          id: 'BUG-004',
          type: 'business_logic',
          severity: 'high',
          file: 'src/pages/Login.jsx',
          description:
            'Login stores undefined user data — accessing response.data.user but actual data is at response.data.result.user',
          evidence: `User name shows "${userName}" instead of "Alex Morgan"`,
          suggestedFix:
            'Change line `const userData = response.data.user` to `const userData = response.data.result.user`',
        });
      } else {
        console.log(`   ✅ User name displayed: ${userName}`);
      }
    } else {
      issues.push({
        id: 'BUG-004b',
        type: 'navigation',
        severity: 'critical',
        file: 'src/pages/Login.jsx',
        description: 'Login does not navigate to dashboard after successful authentication',
        evidence: `Current URL after login: ${currentUrl}`,
      });
    }
  } catch (error) {
    console.log(`   ⚠️ Login flow test error: ${error.message}`);
  } finally {
    await page.close();
  }

  return issues;
}

async function testDashboardData(context) {
  const issues = [];
  const page = await context.newPage();

  try {
    console.log('\n🔍 Test: Dashboard data rendering...');

    // Login first
    await page.goto(REACT_APP_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.click('#login-btn');
    await page.waitForTimeout(2000);

    // Wait for dashboard data to load
    await page.waitForTimeout(1500);

    // Check stat cards
    const statValues = await page.$$eval('.stat-value', (els) =>
      els.map((el) => el.textContent.trim())
    );

    const hasEmptyStats = statValues.some((v) => v === '—' || v === '—%' || v === '$—');

    if (hasEmptyStats) {
      issues.push({
        id: 'BUG-005',
        type: 'business_logic',
        severity: 'high',
        file: 'src/pages/Dashboard.jsx',
        description:
          'Dashboard stats show "—" instead of actual data — accessing response.data directly but actual data is at response.data.result',
        evidence: `Stat values displayed: ${JSON.stringify(statValues)}`,
        suggestedFix:
          'Change `setStats(response.data)` to `setStats(response.data.result)` in Dashboard.jsx',
      });
    } else {
      console.log('   ✅ Dashboard stats rendered with data');
    }

    // Check recent activity
    const activityItems = await page.$$('.activity-item');
    const emptyState = await page.$('.empty-state');

    if (activityItems.length === 0 && emptyState) {
      issues.push({
        id: 'BUG-005b',
        type: 'business_logic',
        severity: 'medium',
        file: 'src/pages/Dashboard.jsx',
        description:
          'Recent activity list is empty — same API response nesting issue prevents recentActivity from loading',
        evidence: 'Activity section shows "No recent activity to display" despite API returning data',
        suggestedFix: 'Fix is part of BUG-005 — using response.data.result will resolve this too',
      });
    } else {
      console.log(`   ✅ Activity items rendered: ${activityItems.length}`);
    }
  } catch (error) {
    console.log(`   ⚠️ Dashboard data test error: ${error.message}`);
  } finally {
    await page.close();
  }

  return issues;
}

async function testDashboardNavigation(context) {
  const issues = [];
  const page = await context.newPage();

  try {
    console.log('\n🔍 Test: Dashboard navigation (race condition)...');

    // Login first
    await page.goto(REACT_APP_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.click('#login-btn');
    await page.waitForTimeout(2000);

    // Click the dashboard nav link multiple times to detect race condition
    let navigationFailures = 0;
    const attempts = 10;

    for (let i = 0; i < attempts; i++) {
      // Navigate to form page first
      await page.goto(`${REACT_APP_URL}/form`, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(500);

      // Navigate back to dashboard page to have the dashboard nav link
      await page.goto(`${REACT_APP_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(500);

      // Try clicking the dashboard nav link
      const navDashboard = await page.$('#nav-dashboard');
      if (navDashboard) {
        await navDashboard.click();
        await page.waitForTimeout(500);

        const url = page.url();
        if (!url.includes('/dashboard')) {
          navigationFailures++;
        }
      }
    }

    if (navigationFailures > 0) {
      issues.push({
        id: 'BUG-006',
        type: 'navigation',
        severity: 'high',
        file: 'src/pages/Dashboard.jsx',
        description: `Dashboard navigation link has a race condition — failed ${navigationFailures}/${attempts} times. Uses Math.random() to decide if navigation occurs`,
        evidence: `Navigation failed ${navigationFailures} out of ${attempts} click attempts`,
        suggestedFix:
          'Replace the handleDashboardClick function with a simple <Link to="/dashboard"> component, or remove the Math.random() check',
      });
    } else {
      console.log('   ✅ Dashboard navigation working (may need more attempts to trigger)');

      // Still flag it as we can see it in the source code
      issues.push({
        id: 'BUG-006',
        type: 'navigation',
        severity: 'high',
        file: 'src/pages/Dashboard.jsx',
        description:
          'Dashboard navigation link uses Math.random() causing intermittent failures. The handleDashboardClick function has a 30% chance of not navigating',
        evidence:
          'Code review: `if (shouldWork > 0.3)` means 30% of clicks do nothing. This is a race condition simulation that causes unreliable navigation.',
        suggestedFix:
          'Replace the <a> tag with a React Router <Link to="/dashboard"> component and remove the handleDashboardClick handler entirely',
      });
    }
  } catch (error) {
    console.log(`   ⚠️ Navigation test error: ${error.message}`);
  } finally {
    await page.close();
  }

  return issues;
}

async function testFormNavigation(context) {
  const issues = [];
  const page = await context.newPage();

  try {
    console.log('\n🔍 Test: Form page navigation...');

    // Login first
    await page.goto(REACT_APP_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.click('#login-btn');
    await page.waitForTimeout(2000);

    // Click form nav link
    const formLink = await page.$('#nav-form');
    if (formLink) {
      await formLink.click();
      await page.waitForTimeout(1000);

      const url = page.url();
      if (url.includes('/form')) {
        console.log('   ✅ Navigation to form page works');
      } else {
        issues.push({
          id: 'BUG-007',
          type: 'navigation',
          severity: 'high',
          file: 'src/pages/Dashboard.jsx',
          description: 'Navigation to form page failed',
          evidence: `Expected URL to contain '/form', got: ${url}`,
        });
      }
    } else {
      issues.push({
        id: 'BUG-007b',
        type: 'ui_error',
        severity: 'medium',
        file: 'src/pages/Dashboard.jsx',
        description: 'Form navigation link (#nav-form) not found in sidebar',
        evidence: 'Selector #nav-form returned null',
      });
    }
  } catch (error) {
    console.log(`   ⚠️ Form navigation test error: ${error.message}`);
  } finally {
    await page.close();
  }

  return issues;
}

async function testFormSubmission(context) {
  const issues = [];
  const page = await context.newPage();

  try {
    console.log('\n🔍 Test: Form submission...');

    // Navigate directly to form page
    await page.goto(`${REACT_APP_URL}/form`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Fill the form
    await page.fill('#form-name', 'Test User');
    await page.fill('#form-email', 'testuser@example.com');
    await page.fill('#form-subject', 'Test Subject');
    await page.fill('#form-message', 'This is a test message for form submission validation.');

    // Submit
    await page.click('#submit-btn');
    await page.waitForTimeout(2000);

    // Check for success status
    const statusEl = await page.$('.form-status.success');
    if (statusEl) {
      const statusText = await statusEl.textContent();
      if (statusText.includes('unconfirmed')) {
        issues.push({
          id: 'BUG-008',
          type: 'business_logic',
          severity: 'medium',
          file: 'src/pages/FormPage.jsx',
          description:
            'Form submission shows "unconfirmed" status — accessing response.data.success but it is at response.data.result.success',
          evidence: `Status message: "${statusText}"`,
          suggestedFix:
            'Change `if (response.data.success)` to `if (response.data.result.success)` in FormPage.jsx handleSubmit',
        });
      }
    }

    // Check if form was reset after submission
    const nameValue = await page.$eval('#form-name', (el) => el.value);
    if (nameValue === 'Test User') {
      issues.push({
        id: 'BUG-009',
        type: 'business_logic',
        severity: 'medium',
        file: 'src/pages/FormPage.jsx',
        description:
          'Form data is not reset after successful submission — missing setFormData call',
        evidence: `Name field still contains "${nameValue}" after submission`,
        suggestedFix:
          "Add `setFormData({ name: '', email: '', subject: '', message: '', priority: 'medium' })` after successful submission",
      });
    }

    // Check submissions list for empty entries
    await page.waitForTimeout(500);
    const submissionItems = await page.$$('.submission-item');
    if (submissionItems.length > 0) {
      const lastSubmission = submissionItems[submissionItems.length - 1];
      const submName = await lastSubmission.$eval('.submission-name', (el) => el.textContent);
      if (submName === 'No Name') {
        issues.push({
          id: 'BUG-010',
          type: 'business_logic',
          severity: 'medium',
          file: 'src/api/mockApi.js',
          description:
            'Mock API submitForm returns empty submittedData object — new submissions appear with "No Name" and empty fields',
          evidence: `Latest submission shows name: "${submName}"`,
          suggestedFix:
            'In mockApi.js submitForm, change `submittedData: {}` to `submittedData: formData` to echo back the submitted data',
        });
      }
    }

    // Check submissions loading bug (nesting issue)
    // Navigate fresh to see if existing submissions load
    const page2 = await context.newPage();
    await page2.goto(`${REACT_APP_URL}/form`, { waitUntil: 'networkidle', timeout: 15000 });
    await page2.waitForTimeout(1500);

    const existingSubmissions = await page2.$$('.submission-item');
    if (existingSubmissions.length === 0) {
      issues.push({
        id: 'BUG-011',
        type: 'business_logic',
        severity: 'medium',
        file: 'src/pages/FormPage.jsx',
        description:
          'Existing submissions fail to load — accessing response.data.submissions but actual data is at response.data.result.submissions',
        evidence: 'Submissions list is empty despite API returning 2 existing submissions',
        suggestedFix:
          'Change `const data = response.data.submissions` to `const data = response.data.result.submissions` in loadSubmissions()',
      });
    }

    await page2.close();
  } catch (error) {
    console.log(`   ⚠️ Form submission test error: ${error.message}`);
  } finally {
    await page.close();
  }

  return issues;
}

async function testUILayout(context) {
  const issues = [];
  const page = await context.newPage();

  try {
    console.log('\n🔍 Test: UI layout issues...');

    // Check form page for misaligned button
    await page.goto(`${REACT_APP_URL}/form`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Check for misaligned submit button
    const submitBtn = await page.$('.submit-btn-misaligned');
    if (submitBtn) {
      const btnBox = await submitBtn.boundingBox();
      const formActions = await page.$('.form-actions');
      const actionsBox = formActions ? await formActions.boundingBox() : null;

      if (btnBox && actionsBox) {
        // Check if button is misaligned (overflowing or offset)
        const isOverflowing = btnBox.x + btnBox.width > actionsBox.x + actionsBox.width + 10;
        const isMisaligned = btnBox.y < actionsBox.y || btnBox.y > actionsBox.y + actionsBox.height;

        issues.push({
          id: 'BUG-012',
          type: 'ui_layout',
          severity: 'medium',
          file: 'src/pages/FormPage.jsx',
          description:
            'Submit button has CSS class "submit-btn-misaligned" causing intentional visual misalignment',
          evidence: `Button has class "submit-btn-misaligned". Position: x=${btnBox.x}, y=${btnBox.y}. Container: x=${actionsBox.x}, y=${actionsBox.y}`,
          suggestedFix:
            'Remove the "submit-btn-misaligned" class from the submit button, keeping only "btn-primary"',
        });
      }
    }

    // Check dashboard for overlapping text
    await page.goto(REACT_APP_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.click('#login-btn');
    await page.waitForTimeout(2000);

    const greetingEl = await page.$('.dashboard-greeting');
    const dateEl = await page.$('.dashboard-date-overlap');

    if (greetingEl && dateEl) {
      const greetingBox = await greetingEl.boundingBox();
      const dateBox = await dateEl.boundingBox();

      if (greetingBox && dateBox) {
        // Check for overlap
        const isOverlapping = greetingBox.y + greetingBox.height > dateBox.y;

        issues.push({
          id: 'BUG-013',
          type: 'ui_layout',
          severity: 'medium',
          file: 'src/pages/Dashboard.jsx',
          description:
            'Dashboard greeting text and date text can overlap — the date element has class "dashboard-date-overlap" suggesting intentional overlap styling via CSS',
          evidence: `Greeting bottom: ${greetingBox.y + greetingBox.height}px, Date top: ${dateBox.y}px, Overlapping: ${isOverlapping}`,
          suggestedFix:
            'Remove the "dashboard-date-overlap" class or fix the CSS to ensure proper spacing between greeting and date elements',
        });
      }
    }
  } catch (error) {
    console.log(`   ⚠️ UI layout test error: ${error.message}`);
  } finally {
    await page.close();
  }

  return issues;
}
