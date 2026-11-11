import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createPaperBroker } from '../paper-trading/broker.js';
import { discoverOpportunities } from '../agents/opportunity-agent.js';
import { createFinancialGraph } from '../finance/graph.js';
import { getMarketSnapshot } from '../finance/market-data.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, '../../public');
const broker = createPaperBroker({ filePath: process.env.SUN_PAPER_STATE });
let latestSnapshot = await getMarketSnapshot();
const agentRuns = [];

function sendJson(response, status, value) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 10_000) throw Object.assign(new Error('Request body too large'), { status: 413 });
  }
  try { return JSON.parse(body || '{}'); }
  catch { throw Object.assign(new Error('Request body must be valid JSON'), { status: 400 }); }
}

export const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      if (request.method === 'GET' && url.pathname === '/api/state') {
        return sendJson(response, 200, {
          market: latestSnapshot,
          graph: createFinancialGraph(latestSnapshot),
          portfolio: await broker.getState(),
          opportunities: discoverOpportunities(latestSnapshot),
          agents: agentRuns.slice(-12),
          mode: 'PAPER_ONLY'
        });
      }
      if (request.method === 'POST' && url.pathname === '/api/refresh') {
        latestSnapshot = await getMarketSnapshot({ force: true });
        return sendJson(response, 200, { market: latestSnapshot, graph: createFinancialGraph(latestSnapshot), opportunities: discoverOpportunities(latestSnapshot) });
      }
      if (request.method === 'POST' && url.pathname === '/api/paper/order') {
        const body = await readJson(request);
        const result = await broker.placeOrder(body);
        return sendJson(response, 200, result);
      }
      if (request.method === 'POST' && url.pathname === '/api/agents/opportunity-scan') {
        const findings = discoverOpportunities(latestSnapshot);
        const run = { id: crypto.randomUUID(), agent: 'Opportunity Scout', at: new Date().toISOString(), status: 'complete', findings: findings.length, summary: `Mapped ${findings.length} evidence-linked opportunity hypotheses; no orders were placed.` };
        agentRuns.push(run);
        return sendJson(response, 200, { run, findings });
      }
      return sendJson(response, 404, { error: 'API route not found' });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return sendJson(response, 405, { error: 'Method not allowed' });
    const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const file = path.resolve(publicDir, requested);
    if (!file.startsWith(`${publicDir}${path.sep}`) && file !== path.join(publicDir, 'index.html')) return sendJson(response, 403, { error: 'Forbidden' });
    const body = await readFile(file);
    const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';
    response.writeHead(200, { 'content-type': `${type}; charset=utf-8`, 'x-content-type-options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    sendJson(response, error.status ?? 500, { error: error.message ?? 'Internal error' });
  }
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4173);
  server.listen(port, '127.0.0.1', () => console.log(`SUN workbench listening at http://127.0.0.1:${port}`));
}
