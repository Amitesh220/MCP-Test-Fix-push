// MCP DevOps Server
// Exposes Playwright testing and git-based fix application as REST endpoints

import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import simpleGit from 'simple-git';
import { runAllTests } from './tests/react-app.spec.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.MCP_PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ────────────────────────────────────────────────────────────
// Health check
// ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mcp-devops-server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ────────────────────────────────────────────────────────────
// POST /run-tests
// Runs the Playwright test suite against the React app
// Returns structured JSON with issues list
// ────────────────────────────────────────────────────────────
app.post('/run-tests', async (req, res) => {
  console.log('\n' + '═'.repeat(60));
  console.log('📋 MCP: /run-tests invoked');
  console.log('═'.repeat(60));

  try {
    const startTime = Date.now();
    const { issues, summary } = await runAllTests();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Tests completed in ${duration}s`);

    res.json({
      status: 'completed',
      duration: `${duration}s`,
      issues,
      summary,
    });
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// ────────────────────────────────────────────────────────────
// POST /apply-fix
// Accepts a file path and updated content, writes it,
// then commits and pushes using simple-git
// ────────────────────────────────────────────────────────────
app.post('/apply-fix', async (req, res) => {
  const { filePath, content, commitMessage, branchName: reqBranchName } = req.body;

  console.log('\n' + '═'.repeat(60));
  console.log(`🔧 MCP: /apply-fix invoked for ${filePath}`);
  console.log('═'.repeat(60));

  if (!filePath || !content) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: filePath and content',
    });
  }

  try {
    // Resolve full path relative to repo root
    const fullPath = path.resolve(REPO_ROOT, filePath);

    // Security: ensure the path is within the repo
    if (!fullPath.startsWith(REPO_ROOT)) {
      return res.status(403).json({
        status: 'error',
        message: 'File path must be within the repository',
      });
    }

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // Write the file
    await fs.writeFile(fullPath, content, 'utf-8');
    console.log(`   📝 File written: ${filePath}`);

    // Git operations
    const git = simpleGit(REPO_ROOT);

    try {
      // Check if we're in a git repo
      const isRepo = await git.checkIsRepo();

      if (isRepo) {
        // Use provided branch name or generate one
        const branchName = reqBranchName || `ai-fixes/${Date.now()}`;
        const currentBranch = await git.branch();

        if (currentBranch.current !== branchName) {
          try {
            const branches = await git.branchLocal();
            if (branches.all.includes(branchName)) {
              await git.checkout(branchName);
              console.log(`   🌿 Switched format to branch: ${branchName}`);
            } else {
              await git.checkoutLocalBranch(branchName);
              console.log(`   🌿 Created branch: ${branchName}`);
            }
          } catch (e) {
            console.log(`   ⚠️ Could not switch to branch ${branchName}: ${e.message}`);
          }
        } else {
          console.log(`   🌿 Already on branch: ${branchName}`);
        }

        // Stage the file
        await git.add(filePath);
        console.log(`   📦 Staged: ${filePath}`);

        // Commit
        const message = commitMessage || `fix: AI-generated fix for ${path.basename(filePath)}`;
        await git.commit(message);
        console.log(`   ✅ Committed: ${message}`);

        // Push
        try {
          await git.push('origin', branchName);
          console.log(`   🚀 Pushed to origin/${branchName}`);
        } catch (pushError) {
          console.log(`   ⚠️ Push skipped (no remote or auth issue): ${pushError.message}`);
        }

        res.json({
          status: 'success',
          filePath,
          branch: branchName,
          commitMessage: message,
          pushed: true,
        });
      } else {
        // Not a git repo, just write the file
        console.log('   ⚠️ Not a git repository — file written without commit');
        res.json({
          status: 'success',
          filePath,
          branch: null,
          commitMessage: null,
          pushed: false,
          note: 'Not a git repository — file written without commit',
        });
      }
    } catch (gitError) {
      // Git operations failed but file was written
      console.log(`   ⚠️ Git operation failed: ${gitError.message}`);
      res.json({
        status: 'partial',
        filePath,
        fileWritten: true,
        gitError: gitError.message,
      });
    }
  } catch (error) {
    console.error(`   ❌ Fix application failed: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// ────────────────────────────────────────────────────────────
// POST /read-file
// Reads a file from the repo (used by the agent to get source code)
// ────────────────────────────────────────────────────────────
app.post('/read-file', async (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ status: 'error', message: 'Missing filePath' });
  }

  try {
    const fullPath = path.resolve(REPO_ROOT, filePath);

    if (!fullPath.startsWith(REPO_ROOT)) {
      return res.status(403).json({ status: 'error', message: 'Path outside repository' });
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    res.json({ status: 'success', filePath, content });
  } catch (error) {
    res.status(404).json({
      status: 'error',
      message: `File not found: ${filePath}`,
    });
  }
});

// ────────────────────────────────────────────────────────────
// Start server
// ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n' + '═'.repeat(60));
  console.log('🚀 MCP DevOps Server');
  console.log('═'.repeat(60));
  console.log(`   Port:     ${PORT}`);
  console.log(`   Repo:     ${REPO_ROOT}`);
  console.log(`   Endpoints:`);
  console.log(`     GET  /health     — Server health check`);
  console.log(`     POST /run-tests  — Run Playwright test suite`);
  console.log(`     POST /apply-fix  — Apply code fix & commit`);
  console.log(`     POST /read-file  — Read source file`);
  console.log('═'.repeat(60) + '\n');
});
