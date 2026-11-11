import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const maxOrderUsd = 5_000;
const feeRate = 0.001;
function freshState() { return { currency: 'USD', cash: 100_000, positions: {}, orders: [], updatedAt: new Date().toISOString() }; }

export function createPaperBroker({ filePath = path.resolve('data/paper-state.json'), priceLookup = async () => ({}) } = {}) {
  async function load() {
    try {
      const parsed = JSON.parse(await readFile(filePath, 'utf8'));
      if (!Number.isFinite(parsed.cash) || !parsed.positions || !Array.isArray(parsed.orders)) return freshState();
      return parsed;
    } catch { return freshState(); }
  }
  async function save(state) {
    await mkdir(path.dirname(filePath), { recursive: true });
    const temporary = `${filePath}.tmp`;
    await writeFile(temporary, JSON.stringify(state, null, 2), { mode: 0o600 });
    const { rename } = await import('node:fs/promises');
    await rename(temporary, filePath);
  }
  return {
    async getState() {
      const state = await load();
      const prices = await priceLookup();
      const marketValue = Object.entries(state.positions).reduce((sum, [symbol, position]) => sum + position.quantity * (prices[symbol] ?? position.averagePrice), 0);
      return { ...state, equity: state.cash + marketValue, marketValue, paperOnly: true };
    },
    async placeOrder({ symbol, side, quantity, price }) {
      if (typeof symbol !== 'string' || !/^[A-Z0-9._-]{1,12}$/.test(symbol)) throw new Error('Invalid asset symbol');
      if (!['buy', 'sell'].includes(side)) throw new Error('Side must be buy or sell');
      if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000) throw new Error('Quantity must be positive and within limits');
      if (!Number.isFinite(price) || price <= 0) throw new Error('A positive reference price is required');
      const notional = quantity * price;
      if (!Number.isFinite(notional) || notional > maxOrderUsd) throw new Error(`Order exceeds $${maxOrderUsd.toLocaleString()} paper limit`);
      const state = await load();
      const fee = notional * feeRate;
      const current = state.positions[symbol] ?? { quantity: 0, averagePrice: 0 };
      if (side === 'buy') {
        if (notional + fee > state.cash) throw new Error('Insufficient paper cash');
        current.averagePrice = ((current.quantity * current.averagePrice) + notional) / (current.quantity + quantity);
        current.quantity += quantity;
        state.cash -= notional + fee;
      } else {
        if (quantity > current.quantity) throw new Error('Paper sell exceeds held quantity; shorting is disabled');
        current.quantity -= quantity;
        state.cash += notional - fee;
        if (current.quantity === 0) current.averagePrice = 0;
      }
      if (current.quantity === 0) delete state.positions[symbol]; else state.positions[symbol] = current;
      const order = { id: crypto.randomUUID(), symbol, side, quantity, price, notional, fee, status: 'filled', mode: 'PAPER', createdAt: new Date().toISOString() };
      state.orders.push(order);
      state.updatedAt = order.createdAt;
      await save(state);
      return { order, portfolio: { ...state, paperOnly: true } };
    }
  };
}
