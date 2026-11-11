import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaperBroker } from '../src/paper-trading/broker.js';
import { createFinancialGraph } from '../src/finance/graph.js';
import { discoverOpportunities } from '../src/agents/opportunity-agent.js';

const sample = { source: 'test-fixture', assets: [
  { id: 'BTC', name: 'Bitcoin', kind: 'crypto', price: 100, change24h: 4.5, dataStatus: 'live' },
  { id: 'NVDA', name: 'NVIDIA', kind: 'equity', price: 50, change24h: 1, dataStatus: 'sample' }
] };

test('financial graph preserves quote provenance and links theme nodes', () => {
  const graph = createFinancialGraph(sample);
  assert.ok(graph.nodes.some(node => node.id === 'AI_TREND'));
  assert.ok(graph.links.some(link => link.source === 'AI_TREND' && link.target === 'NVDA'));
  assert.equal(graph.nodes.find(node => node.id === 'BTC').status, 'live');
  assert.match(graph.provenance, /hypotheses/);
});

test('opportunity scan returns explainable low-confidence hypotheses', () => {
  const results = discoverOpportunities(sample);
  assert.equal(results.length, 1);
  assert.equal(results[0].confidence, 'low');
  assert.equal(results[0].signal, 'accelerating');
  assert.ok(results[0].evidence.length >= 2);
});

test('paper broker executes buys and sells, persists balance, and blocks overselling', async t => {
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = await mkdtemp(join(tmpdir(), 'sun-paper-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const broker = createPaperBroker({ filePath: join(dir, 'state.json') });
  const bought = await broker.placeOrder({ symbol: 'BTC', side: 'buy', quantity: 1, price: 100 });
  assert.equal(bought.order.status, 'filled');
  assert.ok(bought.portfolio.cash < 100_000);
  await assert.rejects(() => broker.placeOrder({ symbol: 'BTC', side: 'sell', quantity: 2, price: 100 }), /exceeds held quantity/);
  const sold = await broker.placeOrder({ symbol: 'BTC', side: 'sell', quantity: 0.5, price: 110 });
  assert.equal(sold.portfolio.positions.BTC.quantity, 0.5);
  assert.equal((await broker.getState()).orders.length, 2);
});

test('paper broker enforces per-order notional cap and rejects invalid quantities', async () => {
  const broker = createPaperBroker({ filePath: '/tmp/sun-broker-test-state.json' });
  await assert.rejects(() => broker.placeOrder({ symbol: 'BTC', side: 'buy', quantity: 1, price: 6_000 }), /exceeds/);
  await assert.rejects(() => broker.placeOrder({ symbol: 'BTC', side: 'buy', quantity: 0, price: 1 }), /positive/);
});
