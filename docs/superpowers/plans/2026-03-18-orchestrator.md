# REPUTRANS Practical MVP — Orchestrator Plan

> **For agentic workers:** REQUIRED: Use superpowers:dispatching-parallel-agents to manage this orchestration. Do NOT execute streams yourself — spawn agents.

**Goal:** Transform REPUTRANS from a developer demo into a navigable MVP with master key display, editable stats, a user dashboard, and a shareable verifier URL.

**Spec:** `docs/superpowers/specs/2026-03-18-practical-mvp-design.md`

---

## Overview

4 implementation streams across 2 waves. Each stream has its own plan file.

| Stream | Plan file | Wave | Depends on |
|--------|-----------|------|-----------|
| D — API Additions | `plans/2026-03-18-stream-d-api-additions.md` | 1 | Nothing |
| C — Verifier URL | `plans/2026-03-18-stream-c-verifier-url.md` | 1 | Nothing |
| A — Wizard Polish | `plans/2026-03-18-stream-a-wizard-polish.md` | 2 | Stream D |
| B — Dashboard | `plans/2026-03-18-stream-b-dashboard.md` | 2 | Stream D |

---

## Wave 1 — Spawn 2 agents IN PARALLEL

**YOU MUST SPAWN BOTH OF THESE AT THE SAME TIME.**

### Agent D instructions

Read: `docs/superpowers/plans/2026-03-18-stream-d-api-additions.md`

Implement everything in that plan. Use `superpowers:executing-plans` or `superpowers:subagent-driven-development`.

Services required:
1. Anvil: `anvil --fork-url https://ethereum-sepolia-rpc.publicnode.com --port 8545`
2. API: `cd packages/api && pnpm build && node dist/server.js`

Exit condition: `node scripts/test-e2e-api.mjs` all green (original 25 + new Stream D tests).

### Agent C instructions

Read: `docs/superpowers/plans/2026-03-18-stream-c-verifier-url.md`

Implement everything in that plan. Use `superpowers:executing-plans` or `superpowers:subagent-driven-development`.

Services required:
1. API on port 3001 (any state is fine, just needs to be running)
2. Frontend: `cd packages/frontend && pnpm dev`

Exit condition: `npx playwright test tests/e2e/verifier-url.spec.ts` all green.

---

## Wait for Wave 1 to complete

Both Agent D and Agent C must finish and report all tests passing before proceeding to Wave 2.

---

## Wave 2 — Spawn 2 agents IN PARALLEL

**YOU MUST SPAWN BOTH OF THESE AT THE SAME TIME, after Wave 1 is done.**

### Agent A instructions

Read: `docs/superpowers/plans/2026-03-18-stream-a-wizard-polish.md`

Pre-check (must pass before starting):
```bash
curl -s -X POST http://localhost:3001/identity/register | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).masterSecret !== undefined"
```
Expected: `true`

Implement everything in that plan.

Exit condition: `npx playwright test tests/e2e/wizard-polish.spec.ts` all green.

### Agent B instructions

Read: `docs/superpowers/plans/2026-03-18-stream-b-dashboard.md`

Pre-check (must pass before starting):
```bash
curl -s http://localhost:3001/session/state
```
Expected: `{"identity":null,"credential":null,"proof":null}`

Implement everything in that plan.

Exit condition: `npx playwright test tests/e2e/dashboard.spec.ts` all green.

---

## Final Verification

After all 4 agents complete, run the full E2E suite:

```bash
cd packages/frontend && pnpm test:e2e
```

Expected: all tests green across all 4 stream test files + the original `reputrans-flow.spec.ts`.

Then run the full demo flow manually:
1. Open `http://localhost:3000/register` — register, see and copy master key
2. Connect — change rating to 4.2, trips to 900
3. Credential — certify
4. Prove — generate ZK proof
5. Verify — verify on-chain
6. Click "Share Your Proof" — copy the URL
7. Open the URL in a new tab — see the verifier view
8. Click "Go to Dashboard" — see identity/credential/proof summary
9. Click "Reset demo" — confirm it returns to `/register` with all state cleared
10. Repeat from step 1 — confirm the flow works a second time

If all 10 steps work without touching the terminal, the MVP is complete.

---

## How to start services for this project

```bash
# Terminal 1: Anvil (Sepolia fork)
anvil --fork-url https://ethereum-sepolia-rpc.publicnode.com --port 8545

# Terminal 2: API
cd packages/api && pnpm build && node dist/server.js

# Terminal 3: Frontend
cd packages/frontend && pnpm dev
```

If port 3001 is already in use:
```bash
netstat -ano | grep ":3001 "
# then: cmd //c "taskkill /PID <pid> /F"
```
