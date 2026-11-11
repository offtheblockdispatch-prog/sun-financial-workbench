const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: value < 1 ? 4 : 2 }).format(value);
let state;
let selectedNode;
const layout = {
  AI_TREND:[420,77], NVDA:[282,173], AMD:[548,173], MSFT:[420,275], POWER:[690,307], REVENUE:[420,410], BTC:[178,330], ETH:[255,410], SOL:[574,410]
};

async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'content-type': 'application/json', ...(options.headers ?? {}) } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `Request failed (${response.status})`);
  return result;
}
function escapeHtml(text) { return String(text).replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[char]); }
function drawGraph(graph) {
  const svg = $('#web');
  svg.replaceChildren();
  const ns = 'http://www.w3.org/2000/svg';
  const point = id => layout[id] ?? [420, 250];
  for (const edge of graph.links) {
    const [x1,y1] = point(edge.source), [x2,y2] = point(edge.target);
    const line = document.createElementNS(ns, 'line'); line.setAttribute('x1',x1); line.setAttribute('y1',y1); line.setAttribute('x2',x2); line.setAttribute('y2',y2); line.setAttribute('class','edge'); svg.append(line);
  }
  for (const edge of graph.links) {
    const [x1,y1] = point(edge.source), [x2,y2] = point(edge.target);
    const label = document.createElementNS(ns, 'text'); label.setAttribute('x',(x1+x2)/2); label.setAttribute('y',(y1+y2)/2-5); label.setAttribute('class','edge-label'); label.textContent=edge.relation; svg.append(label);
  }
  for (const node of graph.nodes) {
    const [x,y] = point(node.id); const group=document.createElementNS(ns,'g');
    const className = node.kind === 'trend' || node.kind === 'industry' ? 'theme-node' : node.kind === 'opportunity' ? 'opportunity-node' : 'market-node';
    group.setAttribute('class',`node ${className}${selectedNode===node.id?' selected':''}`); group.setAttribute('transform',`translate(${x} ${y})`); group.setAttribute('tabindex','0'); group.setAttribute('role','button'); group.setAttribute('aria-label',`${node.name}, select to inspect`);
    const circle=document.createElementNS(ns,'circle'); circle.setAttribute('r',node.kind==='crypto'||node.kind==='equity'?31:38); group.append(circle);
    const text=document.createElementNS(ns,'text'); text.setAttribute('y','-2'); text.textContent=node.id; group.append(text);
    const sub=document.createElementNS(ns,'text'); sub.setAttribute('y','12'); sub.setAttribute('class','sub'); sub.textContent=node.kind==='crypto'||node.kind==='equity'?money(node.price):node.kind.toUpperCase(); group.append(sub);
    group.addEventListener('click',()=>{selectedNode=node.id;drawGraph(graph);showNode(node,graph)}); group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();group.click()}}); svg.append(group);
  }
}
function showNode(node, graph) {
  const relations=graph.links.filter(edge=>edge.source===node.id||edge.target===node.id);
  $('#node-detail').innerHTML=`<div class="selection-mark">✳</div><h2>${escapeHtml(node.name)}</h2><p>${escapeHtml(node.sector)}. ${escapeHtml(node.evidence)}.</p><div class="node-facts">${node.price?`<span class="fact-chip">${money(node.price)}</span>`:''}${node.change24h!==null&&node.change24h!==undefined?`<span class="fact-chip ${node.change24h>=0?'positive':'negative'}">${node.change24h>=0?'+':''}${Number(node.change24h).toFixed(2)}% / 24H</span>`:''}<span class="fact-chip">${escapeHtml(node.status.toUpperCase())}</span><span class="fact-chip">${relations.length} CONNECTIONS</span></div>`;
}
function render() {
  const { market, graph, portfolio, opportunities } = state;
  drawGraph(graph);
  $('#equity').textContent=money(portfolio.equity);
  $('#asset-count').textContent=graph.nodes.length.toString().padStart(2,'0');
  $('#signal-count').textContent=opportunities.length.toString().padStart(2,'0');
  $('#feed-status').textContent=market.source==='coingecko-public-api'?'PARTIAL LIVE':'DEMO FALLBACK';
  $('#feed-source').textContent=market.source==='coingecko-public-api'?'Crypto live · equities sample':'Public feed unavailable';
  $('#connection').textContent=market.source==='coingecko-public-api'?'PUBLIC MARKET LINK ACTIVE':'DEMO DATA / PROVIDER RETRY AVAILABLE';
  $('#observed-at').textContent=`OBSERVED ${new Date(market.observedAt).toLocaleTimeString()}`;
  $('#data-warning').textContent=market.warning;
  $('#markets').innerHTML=market.assets.map(asset=>`<tr><td>${escapeHtml(asset.name)} <span class="subtle">${escapeHtml(asset.id)}</span></td><td>${escapeHtml(asset.kind.toUpperCase())}</td><td>${money(asset.price)}</td><td class="${asset.change24h>=0?'positive':'negative'}">${asset.change24h>=0?'+':''}${asset.change24h.toFixed(2)}%</td><td class="${asset.dataStatus==='live'?'status-live':'status-sample'}">${asset.dataStatus.toUpperCase()}</td><td><button class="text-button trade-shortcut" data-symbol="${escapeHtml(asset.id)}">TRADE</button></td></tr>`).join('');
  $('#symbol').innerHTML=market.assets.map(asset=>`<option value="${escapeHtml(asset.id)}">${escapeHtml(asset.id)} — ${escapeHtml(asset.name)} (${asset.dataStatus})</option>`).join('');
  document.querySelectorAll('.trade-shortcut').forEach(button=>button.addEventListener('click',()=>{$('#symbol').value=button.dataset.symbol;$('#order-form').scrollIntoView({behavior:'smooth',block:'center'})}));
  $('#opportunities').innerHTML=opportunities.map(item=>`<article class="opportunity"><div class="opp-top"><h3>${escapeHtml(item.title)}</h3><span class="score">${item.score}/100</span></div><p>${escapeHtml(item.evidence.join(' · '))}</p><p><span class="confidence">${escapeHtml(item.signal)} / ${escapeHtml(item.confidence)} confidence</span> · ${escapeHtml(item.caveat)}</p></article>`).join('')||'<div class="empty">No candidates in this data window.</div>';
  $('#cash-balance').textContent=`CASH ${money(portfolio.cash)}`;
  const positions=Object.entries(portfolio.positions);
  $('#positions').innerHTML=positions.length?positions.map(([symbol,pos])=>`<div class="position"><span>${escapeHtml(symbol)} · ${pos.quantity.toFixed(6)}</span><span>AVG ${money(pos.averagePrice)}</span></div>`).join(''):'<div class="empty">No open paper positions.</div>';
  if(selectedNode){const node=graph.nodes.find(item=>item.id===selectedNode);if(node)showNode(node,graph)}
}
async function load() { state=await api('/api/state');render(); }
$('#refresh').addEventListener('click',async()=>{const button=$('#refresh');button.disabled=true;try{await api('/api/refresh',{method:'POST'});await load()}catch(error){$('#connection').textContent=error.message}finally{button.disabled=false}});
$('#scan').addEventListener('click',async()=>{try{const result=await api('/api/agents/opportunity-scan',{method:'POST'});$('#agent-status').textContent=`Opportunity Scout complete · ${result.run.findings} hypotheses · no orders placed`;state.opportunities=result.findings;render()}catch(error){$('#agent-status').textContent=`Agent run failed · ${error.message}`}});
$('#order-form').addEventListener('submit',async event=>{event.preventDefault();const asset=state.market.assets.find(item=>item.id===$('#symbol').value);try{const result=await api('/api/paper/order',{method:'POST',body:JSON.stringify({symbol:asset.id,side:$('#side').value,quantity:Number($('#quantity').value),price:asset.price})});$('#order-result').textContent=`PAPER FILLED · ${result.order.side.toUpperCase()} ${result.order.quantity} ${result.order.symbol} @ ${money(result.order.price)} · fee ${money(result.order.fee)}`;$('#agent-status').textContent='Paper order recorded · no exchange was contacted';await load()}catch(error){$('#order-result').textContent=`ORDER BLOCKED · ${error.message}`}});
load().catch(error=>{$('#connection').textContent=`WORKBENCH ERROR · ${error.message}`;$('#agent-status').textContent='Could not load local workbench state'});
setInterval(()=>load().catch(()=>{}),60_000);
