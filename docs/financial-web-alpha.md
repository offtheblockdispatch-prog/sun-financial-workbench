# SUN Financial Web Workbench — initial safe alpha

This standalone app proves the main workbench loop: market-data adapter → provenance-aware graph → explainable research agent → persistent paper portfolio. It is intentionally not an REA clone and does not assume SUN/NERVE internals.

## Start

```sh
npm test
npm start
```

Open <http://127.0.0.1:4173>. Node.js 20 or newer is required. The server binds to loopback only. Crypto quotes try the public CoinGecko API; when it fails, clearly marked sample quotes keep the UI usable. Equity values are always labeled sample data.

Paper account is funded with a local simulated $100,000 balance on first run. Orders are locally recorded, long-only, fee-bearing, and capped at $5,000 notional. To reset, stop the server and remove the ignored `data/paper-state.json` file. No real trading or wallet activity occurs.

See `docs/architecture.md` for boundaries, API routes, upstream research and limitations.
