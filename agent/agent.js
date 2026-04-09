// AI DevOps Agent
// Orchestrates bug detection and code fixing via MCP server and LLM
//
// Usage:
//   node agent.js              — Full pipeline: detect + fix
//   node agent.js --test-only  — Only run tests (detection)
//   node agent.js --fix-only   — Only apply fixes (requires previous test report)

import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────
const CONFIG = {
  mcpServerUrl: process.env.MCP_SERVER_URL || 'http://localhost:4000',
  openaiApiKey: process.env.OPENAI_API_KEY,
  model: process.env.LLM_MODEL || 'gpt-4o-mini',
  maxRetries: 3,
  reportPath: path.join(__dirname, 'reports'),
};

// ────────────────────────────────────────────────────────────
// Logger
// ────────────────────────────────────────────────────────────
const log = {
  info: (msg) => console.log(`\x1b[36mℹ\x1b[0m  ${msg}`),
  success: (msg) => console.log(`\x1b[32m✅\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m⚠\x1b[0m  ${msg}`),
  error: (msg) => console.log(`\x1b[31m❌\x1b[0m ${msg}`),
  section: (msg) => {
    console.log('\n' + '═'.repeat(60));
    console.log(`  ${msg}`);
    console.log('═'.repeat(60));
  },
};

// ────────────────────────────────────────────────────────────
// MCP Client — communicates with the MCP DevOps Server
// ────────────────────────────────────────────────────────────
class MCPClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 120000, // 2 min timeout for Playwright tests
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`MCP server not reachable at ${this.baseUrl}: ${error.message}`);
    }
  }

  async runTests() {
    log.info('Calling MCP /run-tests...');
    const response = await this.client.post('/run-tests');
    return response.data;
  }

  async readFile(filePath) {
    const response = await this.client.post('/read-file', { filePath });
    return response.data;
  }

  async applyFix(filePath, content, commitMessage, branchName) {
    log.info(`Calling MCP /apply-fix for ${filePath}...`);
    const response = await this.client.post('/apply-fix', {
      filePath,
      content,
      commitMessage,
      branchName,
    });
    return response.data;
  }
}

// ────────────────────────────────────────────────────────────
// LLM Client — generates code fixes using OpenAI
// ────────────────────────────────────────────────────────────
class LLMClient {
  constructor(apiKey, model) {
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not set. Please add it to your .env file.'
      );
    }

    this.openai = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateFixes(issues, fileContents) {
    log.info(`Sending ${issues.length} issues to ${this.model} for analysis...`);

    const prompt = this._buildPrompt(issues, fileContents);

    let lastError;
    for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are an expert React developer and code fixer. You will receive bug reports and the current source code of affected files. Your job is to fix all the bugs and return the corrected file contents.

RULES:
- Return ONLY valid JSON, no markdown fences, no explanation
- Fix ALL reported bugs in each file
- Keep all existing functionality intact
- Do not add new features, only fix bugs
- Preserve the code style and formatting
- The response must be a JSON object with a "fixes" array

RESPONSE FORMAT:
{
  "fixes": [
    {
      "filePath": "react-app/src/pages/Login.jsx",
      "content": "// complete corrected file content here",
      "commitMessage": "fix: description of what was fixed"
    }
  ]
}`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 16000,
        });

        const content = response.choices[0].message.content.trim();

        // Parse JSON response (handle possible markdown fences)
        let jsonStr = content;
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const parsed = JSON.parse(jsonStr);

        if (!parsed.fixes || !Array.isArray(parsed.fixes)) {
          throw new Error('LLM response missing "fixes" array');
        }

        log.success(`LLM returned ${parsed.fixes.length} fixes`);
        return parsed.fixes;
      } catch (error) {
        lastError = error;
        log.warn(`LLM attempt ${attempt}/${CONFIG.maxRetries} failed: ${error.message}`);

        if (attempt < CONFIG.maxRetries) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }
    }

    throw new Error(`LLM failed after ${CONFIG.maxRetries} attempts: ${lastError?.message}`);
  }

  _buildPrompt(issues, fileContents) {
    let prompt = '## BUG REPORTS\n\n';

    issues.forEach((issue, i) => {
      prompt += `### Bug ${i + 1}: ${issue.id}\n`;
      prompt += `- **Type:** ${issue.type}\n`;
      prompt += `- **Severity:** ${issue.severity}\n`;
      prompt += `- **File:** ${issue.file}\n`;
      prompt += `- **Description:** ${issue.description}\n`;
      prompt += `- **Evidence:** ${issue.evidence}\n`;
      if (issue.suggestedFix) {
        prompt += `- **Suggested Fix:** ${issue.suggestedFix}\n`;
      }
      prompt += '\n';
    });

    prompt += '## CURRENT FILE CONTENTS\n\n';

    for (const [filePath, content] of Object.entries(fileContents)) {
      prompt += `### File: ${filePath}\n`;
      prompt += '```jsx\n';
      prompt += content;
      prompt += '\n```\n\n';
    }

    prompt +=
      '## INSTRUCTIONS\n\n';
    prompt +=
      'Fix ALL the bugs listed above. Return the complete corrected content for each affected file. ';
    prompt +=
      'Make minimal changes — only fix the reported bugs. Do not refactor or restructure the code.\n';

    return prompt;
  }
}

// ────────────────────────────────────────────────────────────
// Agent — Main orchestrator
// ────────────────────────────────────────────────────────────
class DevOpsAgent {
  constructor() {
    this.mcp = new MCPClient(CONFIG.mcpServerUrl);
    this.llm = null; // Initialized lazily
  }

  async run(mode = 'full') {
    log.section('🤖 AI DevOps Agent — Starting');
    log.info(`Mode: ${mode}`);
    log.info(`MCP Server: ${CONFIG.mcpServerUrl}`);

    // Ensure reports directory exists
    await fs.mkdir(CONFIG.reportPath, { recursive: true });

    // Health check
    try {
      const health = await this.mcp.healthCheck();
      log.success(`MCP server is healthy: ${health.service} v${health.version}`);
    } catch (error) {
      log.error(error.message);
      process.exit(1);
    }

    let testReport;

    // ── PHASE 1: Test / Detect ──
    if (mode === 'full' || mode === 'test-only') {
      testReport = await this.runDetection();

      // Save report
      const reportFile = path.join(CONFIG.reportPath, 'latest-report.json');
      await fs.writeFile(reportFile, JSON.stringify(testReport, null, 2));
      log.success(`Test report saved to ${reportFile}`);

      if (mode === 'test-only') {
        this.printReport(testReport);
        log.section('🧪 Detection Complete — Exiting (test-only mode)');
        return;
      }
    }

    // ── PHASE 2: Fix ──
    if (mode === 'fix-only') {
      // Load previous report
      const reportFile = path.join(CONFIG.reportPath, 'latest-report.json');
      try {
        const data = await fs.readFile(reportFile, 'utf-8');
        testReport = JSON.parse(data);
        log.info(`Loaded previous test report: ${testReport.issues.length} issues`);
      } catch {
        log.error('No previous test report found. Run with --test-only first.');
        process.exit(1);
      }
    }

    if (testReport.issues.length === 0) {
      log.success('No issues found! No fixes needed.');
      return;
    }

    await this.applyFixes(testReport);

    log.section('🎉 AI DevOps Agent — Complete');
  }

  async runDetection() {
    log.section('🧪 Phase 1: Bug Detection');

    const result = await this.mcp.runTests();

    log.info(`Detection complete: ${result.issues.length} issues found in ${result.duration}`);
    this.printReport(result);

    return result;
  }

  async applyFixes(testReport) {
    log.section('🔧 Phase 2: AI-Powered Fix Generation');

    // Initialize LLM
    this.llm = new LLMClient(CONFIG.openaiApiKey, CONFIG.model);

    const issues = testReport.issues;

    // Collect unique affected files
    const affectedFiles = [...new Set(issues.map((i) => i.file).filter((f) => f !== 'unknown'))];
    log.info(`Affected files: ${affectedFiles.join(', ')}`);

    // Read current file contents via MCP
    const fileContents = {};
    for (const file of affectedFiles) {
      const filePath = `react-app/${file}`;
      try {
        const result = await this.mcp.readFile(filePath);
        fileContents[filePath] = result.content;
        log.success(`Read: ${filePath} (${result.content.length} chars)`);
      } catch (error) {
        log.warn(`Could not read ${filePath}: ${error.message}`);
      }
    }

    if (Object.keys(fileContents).length === 0) {
      log.error('No files could be read. Cannot generate fixes.');
      return;
    }

    // Generate fixes via LLM
    const fixes = await this.llm.generateFixes(issues, fileContents);

    // Apply each fix via MCP
    log.section('📝 Applying Fixes');

    const branchName = `ai-fixes/${Date.now()}`;
    let applied = 0;
    let failed = 0;

    for (const fix of fixes) {
      try {
        // Validate fix has required fields
        if (!fix.filePath || !fix.content) {
          log.warn(`Skipping invalid fix: missing filePath or content`);
          failed++;
          continue;
        }

        const result = await this.mcp.applyFix(
          fix.filePath,
          fix.content,
          fix.commitMessage || `fix: AI-generated fix for ${path.basename(fix.filePath)}`,
          branchName
        );

        if (result.status === 'success' || result.status === 'partial') {
          log.success(`Applied fix to ${fix.filePath} — ${fix.commitMessage}`);
          applied++;
        } else {
          log.error(`Failed to apply fix to ${fix.filePath}: ${result.message}`);
          failed++;
        }
      } catch (error) {
        log.error(`Error applying fix to ${fix.filePath}: ${error.message}`);
        failed++;
      }
    }

    log.info(`\nResults: ${applied} fixes applied, ${failed} failed`);

    // Save fix report
    const fixReport = {
      timestamp: new Date().toISOString(),
      totalFixes: fixes.length,
      applied,
      failed,
      fixes: fixes.map((f) => ({
        filePath: f.filePath,
        commitMessage: f.commitMessage,
      })),
    };

    const fixReportFile = path.join(CONFIG.reportPath, 'latest-fixes.json');
    await fs.writeFile(fixReportFile, JSON.stringify(fixReport, null, 2));
    log.success(`Fix report saved to ${fixReportFile}`);
  }

  printReport(report) {
    console.log('\n┌────────────────────────────────────────────┐');
    console.log('│           📊 TEST REPORT                   │');
    console.log('├────────────────────────────────────────────┤');
    console.log(`│  Total Issues:  ${String(report.summary.total).padEnd(25)}│`);
    console.log(`│  Critical:      ${String(report.summary.critical).padEnd(25)}│`);
    console.log(`│  High:          ${String(report.summary.high).padEnd(25)}│`);
    console.log(`│  Medium:        ${String(report.summary.medium).padEnd(25)}│`);
    console.log(`│  Low:           ${String(report.summary.low).padEnd(25)}│`);
    console.log('└────────────────────────────────────────────┘');

    if (report.issues.length > 0) {
      console.log('\nDetailed Issues:');
      report.issues.forEach((issue, i) => {
        const icon =
          issue.severity === 'critical'
            ? '🔴'
            : issue.severity === 'high'
              ? '🟠'
              : issue.severity === 'medium'
                ? '🟡'
                : '🟢';
        console.log(`\n  ${icon} ${issue.id} [${issue.severity.toUpperCase()}]`);
        console.log(`     Type: ${issue.type}`);
        console.log(`     File: ${issue.file}`);
        console.log(`     ${issue.description}`);
      });
    }
  }
}

// ────────────────────────────────────────────────────────────
// Entry point
// ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let mode = 'full';

if (args.includes('--test-only')) {
  mode = 'test-only';
} else if (args.includes('--fix-only')) {
  mode = 'fix-only';
}

const agent = new DevOpsAgent();
agent.run(mode).catch((error) => {
  log.error(`Agent failed: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
