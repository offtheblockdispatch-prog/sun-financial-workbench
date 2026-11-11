const assets = [
  { id: 'BTC', name: 'Bitcoin', kind: 'crypto', providerId: 'bitcoin', price: 67240, change24h: 2.8, volume: 31.4, sector: 'Digital scarcity' },
  { id: 'ETH', name: 'Ethereum', kind: 'crypto', providerId: 'ethereum', price: 3520, change24h: 1.4, volume: 18.2, sector: 'Settlement + compute' },
  { id: 'SOL', name: 'Solana', kind: 'crypto', providerId: 'solana', price: 158.3, change24h: 5.2, volume: 4.7, sector: 'High-throughput apps' },
  { id: 'NVDA', name: 'NVIDIA', kind: 'equity', price: 118.2, change24h: 1.1, volume: 26.1, sector: 'AI infrastructure' },
  { id: 'MSFT', name: 'Microsoft', kind: 'equity', price: 424.6, change24h: 0.6, volume: 7.3, sector: 'AI platforms' },
  { id: 'AMD', name: 'AMD', kind: 'equity', price: 164.8, change24h: -0.8, volume: 5.2, sector: 'AI infrastructure' }
];
let cached = null;
let fetchedAt = 0;

export async function getMarketSnapshot({ force = false, fetchImpl = globalThis.fetch, now = Date.now() } = {}) {
  if (!force && cached && now - fetchedAt < 30_000) return cached;
  const rows = assets.map(asset => ({ ...asset, currency: 'USD', dataStatus: 'sample', observedAt: new Date(now).toISOString() }));
  let source = 'bundled-demo';
  let warning = 'Equities and fallback values are illustrative sample data.';
  try {
    const response = await fetchImpl('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin%2Cethereum%2Csolana&vs_currencies=usd&include_24hr_change=true', { signal: AbortSignal.timeout(4500), headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`Market provider returned HTTP ${response.status}`);
    const live = await response.json();
    for (const asset of rows) {
      const quote = asset.providerId && live[asset.providerId];
      if (quote && Number.isFinite(quote.usd) && quote.usd > 0) {
        asset.price = quote.usd;
        asset.change24h = Number.isFinite(quote.usd_24h_change) ? quote.usd_24h_change : null;
        asset.dataStatus = 'live';
      }
    }
    source = 'coingecko-public-api';
    warning = 'Crypto quotes are public provider observations; equities remain illustrative sample data. Not investment advice.';
  } catch (error) {
    warning = `Live quotes unavailable (${error.message}); showing illustrative sample values.`;
  }
  cached = { source, warning, observedAt: new Date(now).toISOString(), assets: rows };
  fetchedAt = now;
  return cached;
}

export function resetMarketCache() { cached = null; fetchedAt = 0; }
