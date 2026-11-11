import { createWorkbenchSummary, workbenchMeta } from './workbench-meta.js';

console.log('SUN Financial Workbench initialized.');
console.log(JSON.stringify({
  meta: workbenchMeta,
  summary: createWorkbenchSummary()
}, null, 2));
