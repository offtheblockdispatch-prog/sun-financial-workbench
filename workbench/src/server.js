import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { marketSnapshot } from './services/market.js';
import { createGraph, findOpportunities } from './services/graph.js';
import { createWorkflowStore } from './services/workflows.js';
import { createPaperLedger } from './services/paper.js';
import { backtestSma, syntheticBars } from './services/backtest.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(root, '../public');
let market = await marketSnapshot();
const workflows = createWorkflowStore(process.env.SUN_WORKBENCH_RUNS ?? path.resolve(root, '../data/runs.json'));
const ledger = createPaperLedger(process.env.SUN_WORKBENCH_LEDGER ?? path.resolve(root, '../data/paper.json'), () => Object.fromEntries(market.assets.map(x => [x.symbol, x.price])));
const json = (res, status, value) => { res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}); res.end(JSON.stringify(value)); };
async function body(req) { let text=''; for await (const part of req) { text += part; if (Buffer.byteLength(text)>12000) throw Object.assign(new Error('Body too large'),{status:413}); } try { return JSON.parse(text||'{}'); } catch { throw Object.assign(new Error('Invalid JSON body'),{status:400}); } }
export const server = createServer(async (req,res) => {
  try {
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname.startsWith('/api/')) {
      if(req.method==='GET'&&url.pathname==='/api/state') return json(res,200,{market,graph:createGraph(market),opportunities:findOpportunities(market),portfolio:await ledger.state(),workflows:await workflows.list(),roles:workflows.roles,mode:'PAPER_ONLY'});
      if(req.method==='POST'&&url.pathname==='/api/refresh'){market=await marketSnapshot({force:true});return json(res,200,{market});}
      if(req.method==='POST'&&url.pathname==='/api/agents/workflows'){const input=await body(req);return json(res,202,{workflow:await workflows.run(input.prompt,market)});}
      if(req.method==='POST'&&url.pathname.startsWith('/api/agents/workflows/')){const id=decodeURIComponent(url.pathname.slice('/api/agents/workflows/'.length));const input=await body(req);return json(res,200,{workflow:await workflows.review(id,input.decision,input.note)});}
      if(req.method==='POST'&&url.pathname==='/api/paper/order')return json(res,200,await ledger.order(await body(req)));
      if(req.method==='POST'&&url.pathname==='/api/strategies/backtest'){const input=await body(req);const asset=market.assets.find(x=>x.symbol===input.symbol);if(!asset)throw Object.assign(new Error('Unknown asset'),{status:400});const bars=input.bars??syntheticBars(asset,Number(input.count??180));return json(res,200,{result:backtestSma({bars,fast:Number(input.fast??8),slow:Number(input.slow??21),startingCash:Number(input.startingCash??10000)}),dataSource:input.bars?'caller-supplied':'synthetic-demo'});}
      return json(res,404,{error:'API route not found'});
    }
    if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Method not allowed'});
    let relative;try{relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));}catch{return json(res,400,{error:'Invalid path'});}
    const file=path.resolve(publicDir,relative);if(file!==path.join(publicDir,'index.html')&&!file.startsWith(`${publicDir}${path.sep}`))return json(res,403,{error:'Forbidden'});
    const data=await readFile(file);const type=file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'application/octet-stream';res.writeHead(200,{'content-type':`${type}; charset=utf-8`,'x-content-type-options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
  } catch(error) { json(res,error.status??400,{error:error.message??'Request failed'}); }
});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT??4173);server.listen(port,'127.0.0.1',()=>console.log(`SUN workbench listening on http://127.0.0.1:${port}`));}
