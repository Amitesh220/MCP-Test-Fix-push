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

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mcp-devops-server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// RUN TESTS
app.post('/run-tests', async (req, res) => {
  try {
    const startTime = Date.now();
    const { issues, summary } = await runAllTests();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    res.json({
      status: 'completed',
      duration: `${duration}s`,
      issues,
      summary,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// APPLY FIX
app.post('/apply-fix', async (req, res) => {
  const { filePath, content, commitMessage, branchName: reqBranchName } = req.body;

  if (!filePath || !content) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields',
    });
  }

  try {
    const fullPath = path.resolve(REPO_ROOT, filePath);

    if (!fullPath.startsWith(REPO_ROOT)) {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid path',
      });
    }

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');

    const git = simpleGit(REPO_ROOT);

    const isRepo = await git.checkIsRepo();

    if (!isRepo) {
      return res.json({ status: 'success', note: 'Not a git repo' });
    }

    const branchName = reqBranchName || `ai-fixes/${Date.now()}`;
    const currentBranch = await git.branch();

    if (currentBranch.current !== branchName) {
      const branches = await git.branchLocal();
      if (branches.all.includes(branchName)) {
        await git.checkout(branchName);
      } else {
        await git.checkoutLocalBranch(branchName);
      }
    }

    // Stage changes
    await git.add(".");

    // 🔥 DEBUG (optional but useful)
    const status = await git.status();
    console.log("Git status:", status);

    // ✅ FIX: Always commit (even if no changes)
    const message =
      commitMessage || `fix: AI-generated fix for ${path.basename(filePath)}`;

    await git.commit(message, undefined, {
      "--allow-empty": null,
    });

    console.log(`Committed on ${branchName}`);

    // Push
    try {
      await git.push('origin', branchName);
    } catch (e) {
      console.log("Push warning:", e.message);
    }

    res.json({
      status: 'success',
      branch: branchName,
      commitMessage: message,
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// READ FILE
app.post('/read-file', async (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ status: 'error' });
  }

  try {
    const fullPath = path.resolve(REPO_ROOT, filePath);

    if (!fullPath.startsWith(REPO_ROOT)) {
      return res.status(403).json({ status: 'error' });
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    res.json({ status: 'success', content });
  } catch {
    res.status(404).json({ status: 'error' });
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
