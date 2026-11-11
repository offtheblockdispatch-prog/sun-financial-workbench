# Alpha workbench architecture and reuse decisions

The workbench is a standalone Node.js application until SUN, NERVE, and BRIDGE integration contracts are provided. No SUN internal APIs are assumed.

## Runtime components

- `public/`: responsive single-page workbench; SVG graph is interactive and built from API graph data.
- `src/finance/market-data.js`: quote provider adapter. Attempts CoinGecko's public simple-price API for crypto; clear fallback sample quotes and freshness labels remain if the provider is unavailable. Equity quotes are explicitly illustrative.
- `src/finance/graph.js`: financial relationship graph combines quote nodes with labeled thematic hypotheses; those relationships are not presented as proven causality.
- `src/agents/opportunity-agent.js`: deterministic research screen creates explainable, low-confidence momentum hypotheses. It is not an autonomous trading signal.
- `src/paper-trading/broker.js`: persistent JSON paper ledger, fee accounting, cash accounting, long-only positions, and per-order cap. Live execution is not implemented.
- `src/app/server.js`: local HTTP API and static UI; listens on loopback only.

## Run and test

Requires Node.js 20+.

```sh
npm test
npm start
# open http://127.0.0.1:4173
```

Market provider access is optional. If no network is available, the UI shows clearly labeled sample prices. Set `PORT` to change the local port. Set `SUN_PAPER_STATE` to choose a local ledger path. Keep that file private; it is ignored by git.

## API seams

- `GET /api/state`: graph, market snapshot, portfolio, opportunities, mode.
- `POST /api/refresh`: refresh public quote observations.
- `POST /api/paper/order`: simulated order only; requires symbol, side, quantity, reference price.
- `POST /api/agents/opportunity-scan`: run explainable rule-based discovery; does not place orders.

These are prototype contracts, not assumed SUN/NERVE/BRIDGE APIs. Future adapters should translate explicit versioned requests/events at the boundary, with authentication, authorization, retries, audit records, and cancellation designed with the owners of those systems.

## Reuse research and license notes

The design draws on public patterns reviewed from [Hummingbot](https://github.com/hummingbot/hummingbot) (connector boundaries and paper connectors; Apache-2.0), [Freqtrade](https://github.com/freqtrade/freqtrade) (dry-run behavior and strategy separation; GPL-3.0), [CCXT](https://github.com/ccxt/ccxt) (normalized exchange API; MIT), [LangGraph](https://github.com/langchain-ai/langgraph) (stateful workflow/checkpoint concepts; MIT), and [yfinance](https://github.com/ranaroussi/yfinance) (non-official Yahoo data adapter; Apache-2.0 and Yahoo usage restrictions). No upstream source has been copied into this repository.

The user's public `Reverse-Engineer-Anything` fork from `morluto/rea` is intended as an important upstream capability in the broader workbench. Its exact repository URL was not confirmed through repository lookup, so this alpha documents the integration boundary without inventing a URL or importing unknown code. REA remains separate and attributable; this repository composes it rather than copying or silently modifying it.

## Safety and data limitations

- Paper-only: no exchange credentials, wallet signing, live order routes, or fund movement.
- No shorting, no leverage, $5,000 maximum order notional, fee assumption 0.10%.
- Public crypto quote API is best-effort and rate-limited; never call this feed guaranteed real-time.
- Stocks in the demo are static illustrative values and are never labeled as live.
- The opportunity screen is an educational heuristic, not financial advice or a performance claim.
- Local JSON persistence is suitable for a single-user prototype only, not a multi-user or concurrent production service.
