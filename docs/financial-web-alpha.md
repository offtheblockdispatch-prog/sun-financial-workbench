# Financial Web alpha: workflow cockpit

The workbench is a standalone local prototype for SUN integration. Run `npm test` and `npm start` under Node.js 20+. The app binds to `127.0.0.1` and uses local JSON persistence. Do not expose it on an untrusted network.

## What works

- Interactive relationship graph and quote provenance labels.
- Four-role, deterministic research workflow with structured evidence, persistent run history, risk checks, and human report-review decisions.
- Long-only SMA crossover replay with next-bar fills, fee/slippage assumptions, equity curve, and max drawdown. Its default input is synthetic demo data, not historical prices.
- Separate paper broker with persistent local fills and no live exchange path.

REA is an upstream technical-analysis capability system, not a finance agent. It can discover compatible tooling and inspect supported native/application targets; its outputs can include evidence, limitations, and unknowns. The workbench preserves its attribution and does not claim REA capability availability or reconstruction equivalence. See `docs/rea-integration.md`.

Read `docs/workflows-and-simulation.md` for routes and safety boundaries.
