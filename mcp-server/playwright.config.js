// Playwright configuration for MCP DevOps Server
// Used by the test suite in tests/react-app.spec.js

/** @type {import('playwright').LaunchOptions} */
export const playwrightConfig = {
  browser: 'chromium',
  headless: true,
  launchOptions: {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  },
  viewport: {
    width: 1280,
    height: 720,
  },
  timeout: 30000,
  navigationTimeout: 15000,
  baseURL: process.env.REACT_APP_URL || 'http://localhost:3000',
};
