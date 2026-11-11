import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createPaperBroker } from '../paper-trading/broker.js';
import { createDemoCandles, backtestSmaCross } from '../paper-trading/strategy-simulator.js';
import { createOrchestrator } from '../agents/orchestrator.js';
import { createFinancialGraph } from '../finance/graph.js';
import { getMarketSnapshot } from '../finance/market-data.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, '../../public');
let latestSnapshot = await getMarketSnapshot();
const currentPrices = async () => Object.fromEntries(latestSnapshot.assets.map(asset => [asset.id, asset.price]));
const broker = createPaperBroker({ filePath: process.env.SUN_PAPER_STATE, priceLookup: currentPrices });
const orchestrator = createOrchestrator({ filePath: process.env.SUN_AGENT_STATE });
function sendJson(response, status, value) {
  response.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'x-content-type-options':'nosniff' });
  response.end(JSON.stringify(value));
}
async function readJson(request) {
  let body=''; for await (const chunk of request) { body += chunk; if(body.length>10_000) throw Object.assign(new Error('Request body too large'),{status:413}); }
  try { return JSON.parse(body || '{}'); } catch { throw Object.assign(new Error('Request body must be valid JSON'),{status:400}); }
}
export const server = createServer(async (request,response)=>{
  try {
    const url=new URL(request.url,'http://localhost');
    if(url.pathname.startsWith('/api/')) {
      if(request.method==='GET'&&url.pathname==='/api/state') return sendJson(response,200,{market:latestSnapshot,graph:createFinancialGraph(latestSnapshot),portfolio:await broker.getState(),opportunities:(await import('../agents/opportunity-agent.js')).discoverOpportunities(latestSnapshot),agents:await orchestrator.list(),agentRoles:orchestrator.roles,mode:'PAPER_ONLY'});
      if(request.method==='POST'&&url.pathname==='/api/refresh'){latestSnapshot=await getMarketSnapshot({force:true});return sendJson(response,200,{market:latestSnapshot,graph:createFinancialGraph(latestSnapshot)});}
      if(request.method==='POST'&&url.pathname==='/api/paper/order') return sendJson(response,200,await broker.placeOrder(await readJson(request)));
      if(request.method==='POST'&&url.pathname==='/api/agents/workflows'){const body=await readJson(request);return sendJson(response,202,{workflow:await orchestrator.run({prompt:body.prompt,snapshot:latestSnapshot})});}
      if(request.method==='POST'&&url.pathname.startsWith('/api/agents/workflows/')){const id=decodeURIComponent(url.pathname.split('/')[4]??'');const body=await readJson(request);return sendJson(response,200,{workflow:await orchestrator.review(id,body.decision,body.note)});}
      if(request.method==='POST'&&url.pathname==='/api/strategies/backtest'){
        const body=await readJson(request);const asset=latestSnapshot.assets.find(item=>item.id===body.symbol);if(!asset)throw Object.assign(new Error('Unknown asset symbol'),{status:400});
        const candles=body.candles??createDemoCandles(asset,Number(body.candleCount??180));
        return sendJson(response,200,{result:backtestSmaCross({candles,startingCash:body.startingCash??10_000,fastPeriod:body.fastPeriod??8,slowPeriod:body.slowPeriod??21}),data:{source:body.candles?'caller-supplied':'synthetic-demo',symbol:asset.id}});
      }
      return sendJson(response,404,{error:'API route not found'});
    }
    if(request.method!=='GET'&&request.method!=='HEAD')return sendJson(response,405,{error:'Method not allowed'});
    const requested=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));const file=path.resolve(publicDir,requested);
    if(!file.startsWith(`${publicDir}${path.sep}`)&&file!==path.join(publicDir,'index.html'))return sendJson(response,403,{error:'Forbidden'});
    const body=await readFile(file);const type=file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'application/octet-stream';
    response.writeHead(200,{'content-type':`${type}; charset=utf-8`,'x-content-type-options':'nosniff'});response.end(request.method==='HEAD'?undefined:body);
  }catch(error){sendJson(response,error.status??(error.message==='Invalid OHLC candle'?400:400),{error:error.message??'Internal error'});}
});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT??4173);server.listen(port,'127.0.0.1',()=>console.log(`SUN workbench listening at http://127.0.0.1:${port}`));}
