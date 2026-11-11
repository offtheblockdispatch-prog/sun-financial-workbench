import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrchestrator } from '../src/agents/orchestrator.js';
import { backtestSmaCross, createDemoCandles } from '../src/paper-trading/strategy-simulator.js';

const snapshot={source:'test-feed',assets:[{id:'BTC',name:'Bitcoin',kind:'crypto',price:100,change24h:2.5,currency:'USD',dataStatus:'live',observedAt:'2026-01-01T00:00:00.000Z'}]};

test('orchestrated agent roles produce persisted provenance and require human review',async t=>{
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const dir=await mkdtemp(join(tmpdir(),'sun-agent-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const filePath=join(dir,'runs.json');const orchestrator=createOrchestrator({filePath,clock:()=>new Date('2026-01-02T00:00:00.000Z')});
 const run=await orchestrator.run({prompt:'Map digital asset infrastructure',snapshot});
 assert.equal(run.status,'review_required');assert.equal(run.agents.length,4);assert.equal(run.evidence[0].epistemicStatus,'observed');assert.equal(run.riskReview.checks.find(item=>item.id==='live-execution').status,'blocked');
 const reloaded=createOrchestrator({filePath});assert.equal((await reloaded.list()).length,1);
 const reviewed=await reloaded.review(run.id,'approve_research','Reviewed evidence only');assert.equal(reviewed.status,'approved_research');assert.equal(reviewed.approval.scope,'research_report_only');
 await assert.rejects(()=>reloaded.review(run.id,'approve_research'),/not awaiting review/);
});

test('agent orchestration refuses empty or oversized prompts',async()=>{const agent=createOrchestrator({filePath:'/tmp/sun-agent-invalid.json'});await assert.rejects(()=>agent.run({prompt:'x',snapshot}),/3–240/);});

test('SMA simulator has bounded inputs and emits auditable paper-only performance',()=>{
 const asset={id:'BTC',price:100,dataStatus:'sample'};const candles=createDemoCandles(asset,180);const result=backtestSmaCross({candles});
 assert.equal(result.simulationOnly,true);assert.equal(result.equityCurve.length,candles.length-1);assert.ok(Number.isFinite(result.maxDrawdownPct));assert.ok(result.limitations.some(item=>item.includes('synthetic')));
 assert.throws(()=>backtestSmaCross({candles,fastPeriod:21,slowPeriod:8}),/fast period/);
 assert.throws(()=>backtestSmaCross({candles:[{open:1,high:0,low:0,close:1}]}),/30–5000/);
});
