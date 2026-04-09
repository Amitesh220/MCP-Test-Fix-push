# 🤖 AI-First DevOps System — MCP CI/CD

An end-to-end AI-powered DevOps pipeline that uses an **MCP (Model Context Protocol) server** as the tool layer and an **AI agent** as the decision layer to automatically detect and fix bugs in a React application.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions Pipeline                   │
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │  Detect   │──▶│ Approve  │──▶│  Fix     │──▶│  Merge   │ │
│  │  Bugs     │   │ (Manual) │   │  Code    │   │ (Manual) │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
└─────────────────────────────────────────────────────────────┘
        │                              │
        ▼                              ▼
┌──────────────┐              ┌──────────────┐
│   AI Agent   │◀────────────▶│  MCP Server  │
│  (Decision)  │   REST API   │   (Tools)    │
└──────────────┘              └──────────────┘
        │                       │          │
        ▼                       ▼          ▼
  ┌──────────┐           ┌──────────┐ ┌─────────┐
  │  OpenAI  │           │Playwright│ │simple-git│
  │ GPT-4o   │           │ Browser  │ │  Commit  │
  └──────────┘           └──────────┘ └─────────┘
                              │
                              ▼
                        ┌──────────┐
                        │React App │
                        │ (Nexus)  │
                        └──────────┘
```

## Project Structure

```
mcp-cicd/
├── react-app/           # React SPA (Nexus CRM) — DO NOT MODIFY
│   ├── src/
│   │   ├── pages/       # Login, Dashboard, FormPage
│   │   ├── api/         # Mock API with intentional bugs
│   │   └── ...
│   └── package.json
│
├── mcp-server/          # MCP DevOps Server (Express + Playwright)
│   ├── server.js        # Express server with /run-tests, /apply-fix
│   ├── tests/           # Playwright test suite
│   │   └── react-app.spec.js
│   ├── playwright.config.js
│   └── package.json
│
├── agent/               # AI Agent (OpenAI + axios)
│   ├── agent.js         # Orchestrator: detect → LLM → fix
│   ├── .env.example     # Environment variables template
│   └── package.json
│
├── .github/workflows/
│   └── ai-devops.yml    # Full CI/CD pipeline
│
├── .env.example         # Root env template
├── .gitignore
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- An OpenAI API key

### 1. Install Dependencies

```bash
# React app
cd react-app && npm install && cd ..

# MCP Server
cd mcp-server && npm install && cd ..

# Install Playwright browsers
cd mcp-server && npx playwright install chromium && cd ..

# Agent
cd agent && npm install && cd ..
```

### 2. Configure Environment

```bash
# Copy env templates
cp .env.example .env
cp agent/.env.example agent/.env

# Edit and add your OpenAI API key
# OPENAI_API_KEY=sk-your-key-here
```

### 3. Run Locally

**Terminal 1 — Start React App:**
```bash
cd react-app
npm run dev
# Runs on http://localhost:3000
```

**Terminal 2 — Start MCP Server:**
```bash
cd mcp-server
npm start
# Runs on http://localhost:4000
```

**Terminal 3 — Run AI Agent:**
```bash
cd agent

# Full pipeline (detect + fix)
node agent.js

# Detection only
node agent.js --test-only

# Apply fixes only (requires previous test report)
node agent.js --fix-only
```

## MCP Server Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/run-tests` | Run Playwright test suite, returns structured issues |
| `POST` | `/apply-fix` | Write file, commit, and push via git |
| `POST` | `/read-file` | Read a source file from the repo |

### Example: Run Tests

```bash
curl -X POST http://localhost:4000/run-tests
```

### Example: Apply Fix

```bash
curl -X POST http://localhost:4000/apply-fix \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "react-app/src/pages/Login.jsx",
    "content": "// fixed code here...",
    "commitMessage": "fix: corrected email validation"
  }'
```

## CI/CD Pipeline

The GitHub Actions pipeline has 5 stages:

1. **🧪 AI Bug Detection** — Starts the React app and MCP server, runs the AI tester agent
2. **✋ Approve Fixes** — Manual approval gate (uses `trstringer/manual-approval`)
3. **🔧 Apply AI Fixes** — Runs the AI fixer agent to generate and apply code fixes
4. **✋ Approve Merge** — Manual approval before merging to main
5. **🔀 Merge AI Fixes** — Merges the fix branch into main

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for the AI agent |
| `APPROVERS` | Comma-separated list of GitHub usernames for manual approval |

### Required GitHub Environments

Create two environments in your repo settings:
- `staging` — for post-detection approval
- `production` — for pre-merge approval

## Detected Bug Categories

The AI tester detects these categories of bugs:

- **Business Logic** — Incorrect data access patterns, weak validation
- **Navigation** — Broken links, race conditions
- **UI Layout** — Overlapping elements, misaligned components
- **State Management** — Missing state updates, incorrect data flow
- **API Integration** — Response format mismatches

## License

MIT
