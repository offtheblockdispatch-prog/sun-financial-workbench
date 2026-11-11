# Workflows, structured evidence, and simulation

## Research pipeline

`POST /api/agents/workflows` runs a deterministic local pipeline with four named roles: Market Researcher, Relationship Analyst, Opportunity Scout, and Risk Reviewer. Each role records its status and output count. Runs persist as JSON in `data/agent-runs.json` (or `SUN_AGENT_STATE`). This prototype does not call an LLM; role execution is bounded and auditable rule-based analysis.

The completed report is `review_required`. `POST /api/agents/workflows/{id}` accepts `approve_research` or `reject` plus an optional note. Approval applies **only to the research report** and cannot authorize trading or any other external action. A reviewer decision is durable and duplicate decisions are rejected.

Evidence records include stable IDs, claim text, epistemic status, source, observed time, and limitations. Quote observations do not make a thematic edge factual. The agent output includes an explicit blocked live-execution risk check.

## Strategy simulation

`POST /api/strategies/backtest` runs a long-only moving-average crossover replay. Signals use completed candles and fill at the next bar's open with configurable fee/slippage assumptions. Results include equity curve, fills, return, drawdown, parameters, and limitations. The default 180 bars are generated synthetic demo data; they are not historical market data. Caller-supplied OHLC candles are validated but remain the caller's responsibility for provenance.

The paper broker is still separate from research and strategy replay. There is no workflow-to-order route. Paper orders retain local-only, long-only, and per-order notional safeguards.

## API

- `GET /api/state` — workbench state, latest roles, persisted runs.
- `POST /api/agents/workflows` — create a research-only run with `{ "prompt": "..." }`.
- `POST /api/agents/workflows/{id}` — review with `{ "decision": "approve_research" | "reject", "note": "..." }`.
- `POST /api/strategies/backtest` — replay `{ "symbol": "BTC", "fastPeriod": 8, "slowPeriod": 21 }`.
- `POST /api/paper/order` — simulated order only; independent of agents.

Local JSON state is single-process prototype storage, not multi-user production persistence. Do not expose this unauthenticated loopback prototype to an untrusted network.
