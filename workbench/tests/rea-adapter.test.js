import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createReaAdapter } from '../src/services/rea-adapter.js';

function fakeSpawn({ tools = [{ name: 'analyze_function', description: 'Evidence-bearing native function analysis' }] } = {}) {
  const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough(); child.exitCode = null; child.killed = false;
  child.kill = () => { child.killed = true; child.exitCode = 0; child.emit('exit', 0, null); return true; };
  child.stdin.on('data', chunk => {
    const request = JSON.parse(chunk.toString().trim());
    if (request.id === undefined) return;
    const result = request.method === 'initialize' ? { protocolVersion: '2025-11-25', serverInfo: { name: 'rea', version: 'test' }, capabilities: { tools: {} } } : { tools };
    queueMicrotask(() => child.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request.id, result })}\n`));
  });
  return child;
}

test('REA adapter discovers tool catalog through stdio MCP without invoking tools', async () => {
  const adapter = createReaAdapter({ spawnImpl: () => fakeSpawn(), timeoutMs: 200 });
  const result = await adapter.discover();
  assert.equal(result.available, true);
  assert.equal(result.toolCount, 1);
  assert.equal(result.tools[0].name, 'analyze_function');
  assert.match(result.limitations[0], /does not invoke/);
});

test('REA adapter reports unavailable without installing or making up capabilities', async () => {
  const adapter = createReaAdapter({ spawnImpl: () => { throw new Error('rea executable not found'); }, timeoutMs: 200 });
  const result = await adapter.discover();
  assert.equal(result.available, false);
  assert.equal(result.status, 'unavailable');
  assert.equal(result.toolCount, undefined);
  assert.match(result.error, /not found/);
});
