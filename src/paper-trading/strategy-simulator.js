const sma = (values, period) => values.map((_, index) => index + 1 < period ? null : values.slice(index + 1 - period, index + 1).reduce((sum, value) => sum + value, 0) / period);

export function createDemoCandles(asset, count = 180) {
  if (!Number.isInteger(count) || count < 60 || count > 1000) throw new Error('Candle count must be between 60 and 1000');
  const seed = [...asset.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const base = asset.dataStatus === 'sample' ? asset.price : asset.price;
  const candles = [];
  for (let i = 0; i < count; i++) {
    const cycle = Math.sin((i + seed) / 8) * 0.035 + Math.sin((i + seed) / 23) * 0.06;
    const drift = (i / count - 0.5) * 0.16;
    const close = Math.max(base * 0.5, base * (1 + cycle + drift));
    const previous = candles.at(-1)?.close ?? close * 0.997;
    candles.push({ timestamp: new Date(Date.UTC(2025, 0, 1 + i)).toISOString(), open: previous, high: Math.max(previous, close) * 1.004, low: Math.min(previous, close) * 0.996, close, volume: 1000 + ((i * 97 + seed) % 5000) });
  }
  return candles;
}

export function backtestSmaCross({ candles, startingCash = 10_000, fastPeriod = 8, slowPeriod = 21, feeRate = 0.001, slippageRate = 0.0005, maxExposure = 0.5 }) {
  if (!Array.isArray(candles) || candles.length < 30 || candles.length > 5000) throw new Error('Provide 30–5000 candles');
  if (!Number.isFinite(startingCash) || startingCash <= 0 || startingCash > 1_000_000) throw new Error('Starting cash must be within (0, 1,000,000]');
  if (!Number.isInteger(fastPeriod) || !Number.isInteger(slowPeriod) || fastPeriod < 2 || slowPeriod <= fastPeriod || slowPeriod > candles.length) throw new Error('Require 2 <= fast period < slow period <= candle count');
  if (![feeRate, slippageRate, maxExposure].every(Number.isFinite) || feeRate < 0 || feeRate > 0.02 || slippageRate < 0 || slippageRate > 0.02 || maxExposure <= 0 || maxExposure > 1) throw new Error('Invalid simulation cost or exposure setting');
  for (const candle of candles) if (![candle.open,candle.high,candle.low,candle.close].every(value => Number.isFinite(value) && value > 0) || candle.high < Math.max(candle.open,candle.close) || candle.low > Math.min(candle.open,candle.close)) throw new Error('Invalid OHLC candle');
  const closes = candles.map(candle => candle.close); const fast = sma(closes, fastPeriod); const slow = sma(closes, slowPeriod);
  let cash = startingCash; let quantity = 0; const trades = []; const equityCurve = [];
  for (let i = 1; i < candles.length; i++) {
    // Signal uses the completed prior candle and fills at this candle's open: no same-bar lookahead.
    const prior = i - 1; const signal = fast[prior] !== null && slow[prior] !== null && fast[i - 1] !== null && slow[i - 1] !== null;
    const crossedUp = signal && fast[prior] <= slow[prior] && fast[i] > slow[i];
    const crossedDown = signal && fast[prior] >= slow[prior] && fast[i] < slow[i];
    if (crossedUp && quantity === 0) {
      const fill = candles[i].open * (1 + slippageRate); const spend = Math.min(cash, startingCash * maxExposure); const bought = spend / (fill * (1 + feeRate));
      if (bought > 0) { const fee = bought * fill * feeRate; cash -= bought * fill + fee; quantity = bought; trades.push({ side:'buy', timestamp:candles[i].timestamp, price:fill, quantity:bought, fee }); }
    } else if (crossedDown && quantity > 0) {
      const fill = candles[i].open * (1 - slippageRate); const fee = quantity * fill * feeRate; cash += quantity * fill - fee; trades.push({ side:'sell', timestamp:candles[i].timestamp, price:fill, quantity, fee }); quantity = 0;
    }
    equityCurve.push({ timestamp:candles[i].timestamp, equity: cash + quantity * candles[i].close });
  }
  const finalEquity = cash + quantity * candles.at(-1).close;
  return { strategy:'SMA crossover', parameters:{ fastPeriod, slowPeriod, feeRate, slippageRate, maxExposure }, startingCash, finalEquity, netReturnPct:(finalEquity / startingCash - 1) * 100, maxDrawdownPct: maxDrawdown(equityCurve, startingCash), trades, openPosition:quantity, equityCurve, simulationOnly:true, limitations:['Historical replay is a simplified educational simulation; fills, liquidity, taxes, and market impact are not modeled.', 'Demo candles are synthetic and cannot establish strategy performance.', 'Past simulated results do not predict future results.'] };
}
function maxDrawdown(curve, initial) { let peak=initial; let worst=0; for(const point of curve){peak=Math.max(peak,point.equity);if(peak>0)worst=Math.max(worst,(peak-point.equity)/peak)}return worst*100 }
