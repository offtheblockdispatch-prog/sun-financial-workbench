# SUN Workbench (standalone application)

This directory is a self-contained, no-dependency Node.js workbench slice inside the existing repository. It combines an evidence-aware financial graph, deterministic multi-role research workflow, review gates, paper-only trading, and a strategy replay lab. It runs locally on Node.js 20+.

## Run from the repository root

```sh
cd workbench
npm test
npm run lint
npm run build
npm start
```

Open <http://127.0.0.1:4173>. No install step or third-party package is required. The server binds to loopback. `data/` holds ignored local JSON state. Crypto quote retrieval is best-effort; equity/fallback values and generated strategy candles are explicitly sample/synthetic, not current prices or historical performance.

## What the roles do

Market Researcher captures labeled quote observations; Relationship Analyst builds links marked as hypotheses; Opportunity Scout emits transparent research candidates; Risk Reviewer flags uncertainty and blocks live financial execution. This initial orchestration is deterministic local code, not an LLM runtime. Runs wait for operator review. `approve_research` approves only a report, never a trade.

## REA boundary

REA is a separate upstream technical-analysis system. Its appropriate role is capability discovery and supported inspection of authorized binaries/applications, provider-routed analysis, and evidence-bearing findings/reconstruction workflows. The workbench does not treat REA as a market-data source, financial agent, exchange executor, or guarantee that every decompiler/platform is available. Preserve upstream evidence and limitations without rewriting provenance. See `docs/rea-boundary.md`.

## Financial safeguards

No live exchange, wallet signing, credential storage, leverage, short sales, or order route exists. Paper orders have fees, a per-order notional cap, and local persistence. Strategy replay uses prior completed bars and next-bar-open fills, includes configurable fee/slippage, and defaults to synthetic demo candles. Results are educational, not advice or performance claims.

## API

- `GET /api/state`
- `POST /api/refresh`
- `POST /api/paper/order` — simulated only
- `POST /api/agents/workflows` with `{ "prompt": "..." }`
- `POST /api/agents/workflows/:id` with `{ "decision": "approve_research" | "reject", "note": "..." }`
- `POST /api/strategies/backtest` with a symbol and optional simulation parameters

Local JSON persistence is single-process prototype storage, not production multi-user persistence. Don’t expose the unauthenticated development server to an untrusted network.
