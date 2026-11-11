const edges = [
  ['BTC', 'ETH', 'shared digital-asset liquidity'], ['ETH', 'SOL', 'smart-contract platforms'],
  ['NVDA', 'AMD', 'accelerator competition'], ['NVDA', 'MSFT', 'AI compute demand'],
  ['MSFT', 'ETH', 'cloud and blockchain ecosystem'], ['AI_TREND', 'NVDA', 'compute supply'],
  ['AI_TREND', 'AMD', 'alternative compute supply'], ['AI_TREND', 'MSFT', 'enterprise deployment'],
  ['AI_TREND', 'POWER', 'data-center energy demand'], ['POWER', 'NVDA', 'power-intensive compute'],
  ['ETH', 'REVENUE', 'developer tooling / infrastructure services'], ['SOL', 'REVENUE', 'consumer application infrastructure']
];
const extras = [
  { id: 'AI_TREND', name: 'AI infrastructure demand', kind: 'trend', sector: 'Cross-market theme', change24h: 3.2, price: null },
  { id: 'POWER', name: 'Data-center power', kind: 'industry', sector: 'Energy + infrastructure', change24h: 1.8, price: null },
  { id: 'REVENUE', name: 'Infrastructure revenue models', kind: 'opportunity', sector: 'Business models', change24h: null, price: null }
];

export function createFinancialGraph(snapshot) {
  const byId = new Map(snapshot.assets.map(asset => [asset.id, asset]));
  const nodes = [...snapshot.assets, ...extras].map(node => ({ ...node, status: node.dataStatus ?? 'inferred', evidence: node.dataStatus === 'live' ? `Live public quote from ${snapshot.source}` : node.dataStatus === 'sample' ? 'Illustrative demo observation' : 'Analyst relationship hypothesis' }));
  const links = edges.filter(([source, target]) => (byId.has(source) || extras.some(item => item.id === source)) && (byId.has(target) || extras.some(item => item.id === target))).map(([source, target, relation]) => ({ source, target, relation }));
  return { nodes, links, provenance: 'Quotes retain provider status; thematic links are hypotheses, not causal findings.' };
}
