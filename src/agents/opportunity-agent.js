export function discoverOpportunities(snapshot) {
  return snapshot.assets.filter(asset => asset.kind === 'crypto' && Number.isFinite(asset.change24h)).map(asset => {
    const momentum = asset.change24h;
    const score = Math.max(0, Math.min(100, Math.round(50 + momentum * 4)));
    return {
      id: `momentum-${asset.id.toLowerCase()}`,
      title: `${asset.name} relative momentum watch`,
      relatedAssets: [asset.id, asset.id === 'BTC' ? 'ETH' : 'AI_TREND'],
      signal: momentum >= 3 ? 'accelerating' : momentum <= -2 ? 'weakening' : 'mixed',
      score,
      confidence: 'low',
      evidence: [`${asset.change24h.toFixed(2)}% reported 24-hour change`, `quote source: ${asset.dataStatus}`, 'Rule-based screen only; does not establish a predictive edge.'],
      caveat: 'Hypothesis for research, not a recommendation or expected return.'
    };
  }).sort((a, b) => b.score - a.score);
}
