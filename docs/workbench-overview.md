# Alpha workbench implementation notes

## Current product slice

The first runnable slice combines a dark, responsive financial-intelligence console, an interactive SVG relationship map, quote-provider adapter, deterministic opportunity researcher, persistent local paper ledger, and a loopback HTTP API.

## How to explore

1. Open a node in the graph to inspect its category, quote provenance, and number of modeled relationships.
2. Compare green `LIVE` crypto observations with gold `SAMPLE` equities/fallback values.
3. Run Opportunity Scout to produce evidence-listed, low-confidence hypotheses.
4. Simulate a buy or sell in the paper account. A simulated fill only updates the local ledger; no exchange or wallet is contacted.

The map mixes observed market nodes with inferred theme nodes. The visual links are hypotheses for exploration, not proof of money flow or causation.

## Next architectural increments

- versioned event envelope and model-agnostic NERVE agent adapter
- a reviewed graph schema for entities, claims, evidence, and confidence
- historical candles and point-in-time strategy replay
- proper SQLite/Postgres persistence, migrations, audit log, and concurrency controls
- accessibility and keyboard-navigation polish, graph zoom/filter, and larger graph layouts
- provider-specific legal/usage review and data freshness policies

Live trading and transaction signing remain out of scope until separate threat modeling, credentials design, sandbox verification, human approval flow, and operational safeguards exist.
