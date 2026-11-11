import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { createFinancialGraph } from '../finance/graph.js';
import { discoverOpportunities } from './opportunity-agent.js';

const roles = [
  { id: 'market-researcher', name: 'Market Researcher', purpose: 'Collect timestamped market observations and provider status.' },
  { id: 'relationship-analyst', name: 'Relationship Analyst', purpose: 'Map related assets and distinguish thematic hypotheses from observations.' },
  { id: 'opportunity-scout', name: 'Opportunity Scout', purpose: 'Create transparent rule-based research candidates, not trade recommendations.' },
  { id: 'risk-reviewer', name: 'Risk Reviewer', purpose: 'Check data freshness, source limitations, uncertainty, and action boundaries.' }
];

export function createOrchestrator({ filePath = path.resolve('data/agent-runs.json'), clock = () => new Date() } = {}) {
  let queue = Promise.resolve();
  async function load() {
    try { const data = JSON.parse(await readFile(filePath, 'utf8')); return Array.isArray(data.runs) ? data.runs : []; }
    catch { return []; }
  }
  async function save(runs) {
    await mkdir(path.dirname(filePath), { recursive: true });
    const temp = `${filePath}.tmp`;
    await writeFile(temp, JSON.stringify({ schemaVersion: 1, runs }, null, 2), { mode: 0o600 });
    await rename(temp, filePath);
  }
  async function serialized(operation) {
    const next = queue.then(operation, operation);
    queue = next.then(() => undefined, () => undefined);
    return next;
  }
  return {
    roles,
    async list() { return load(); },
    async run({ prompt, snapshot }) {
      if (typeof prompt !== 'string' || prompt.trim().length < 3 || prompt.length > 240) throw new Error('Task must be 3–240 characters');
      return serialized(async () => {
        const now = clock().toISOString();
        const graph = createFinancialGraph(snapshot);
        const opportunities = discoverOpportunities(snapshot);
        const evidence = snapshot.assets.map(asset => ({
          id: `market:${asset.id}:${Date.parse(asset.observedAt) || Date.parse(now)}`,
          kind: 'market_observation', claim: `${asset.id} quoted at ${asset.price} ${asset.currency ?? 'USD'}; 24h change ${asset.change24h ?? 'unknown'}`,
          epistemicStatus: asset.dataStatus === 'live' ? 'observed' : 'observed_sample',
          source: snapshot.source, observedAt: asset.observedAt ?? now,
          limitations: asset.dataStatus === 'live' ? ['Public provider quote; freshness and completeness depend on provider.'] : ['Illustrative sample value; not a current market observation.']
        }));
        const run = {
          id: crypto.randomUUID(), prompt: prompt.trim(), status: 'review_required', createdAt: now,
          mode: 'research_only', agents: roles.map((role, index) => ({ ...role, status: 'complete', completedAt: now, outputCount: index === 0 ? evidence.length : index === 1 ? graph.links.length : index === 2 ? opportunities.length : 1 })),
          evidence, graphSummary: { nodes: graph.nodes.length, relationships: graph.links.length, relationshipStatus: 'inferred_hypotheses' },
          opportunities, riskReview: { status: 'review_required', checks: [
            { id: 'data-provenance', status: 'pass', note: 'Observations carry provider/sample status.' },
            { id: 'inference-labeling', status: 'pass', note: 'Graph edges are labeled as hypotheses, not facts.' },
            { id: 'live-execution', status: 'blocked', note: 'This workbench has no live order or wallet execution capability.' }
          ] },
          approval: null,
          summary: `Research pipeline completed for ${prompt.trim()}. ${evidence.length} asset observations, ${graph.links.length} relationship hypotheses, and ${opportunities.length} rule-based candidates. Human review is required; no financial action was taken.`
        };
        const runs = await load(); runs.push(run); await save(runs);
        return run;
      });
    },
    async review(id, decision, note = '') {
      if (!['approve_research', 'reject'].includes(decision)) throw new Error('Decision must be approve_research or reject');
      if (typeof note !== 'string' || note.length > 500) throw new Error('Review note must be at most 500 characters');
      return serialized(async () => {
        const runs = await load(); const run = runs.find(item => item.id === id);
        if (!run) throw Object.assign(new Error('Workflow not found'), { status: 404 });
        if (run.status !== 'review_required') throw Object.assign(new Error('Workflow is not awaiting review'), { status: 409 });
        run.status = decision === 'approve_research' ? 'approved_research' : 'rejected';
        run.approval = { decision, note: note.trim(), reviewedAt: clock().toISOString(), scope: 'research_report_only' };
        await save(runs); return run;
      });
    }
  };
}
