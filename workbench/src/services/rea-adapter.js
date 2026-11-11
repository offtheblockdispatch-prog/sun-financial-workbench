import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const PROTOCOL_VERSION = '2025-11-25';
const MAX_LINE_BYTES = 2 * 1024 * 1024;
const MAX_TOOLS = 500;
const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * A small stdio MCP discovery client for an already-installed REA CLI.
 * It never downloads/installs REA and deliberately exposes no tools/call route.
 * Treat tool descriptions/results from analysis targets as untrusted input.
 */
export function createReaAdapter({ command = process.env.REA_BIN || 'rea', args = ['mcp'], timeoutMs = DEFAULT_TIMEOUT_MS, spawnImpl = spawn } = {}) {
  let cached = null;
  return {
    async discover() {
      if (cached && Date.now() - cached.checkedAt < 30_000) return cached;
      const checkedAt = new Date().toISOString();
      const child = spawnImpl(command, args, { stdio: ['pipe', 'pipe', 'pipe'], shell: false, windowsHide: true, env: { ...process.env, REA_LOG_LEVEL: process.env.REA_LOG_LEVEL || 'silent' } });
      let stdoutBuffer = '';
      let stderr = '';
      const pending = new Map();
      let nextId = 0;
      let settled = false;
      let protocolError = null;
      const finishPending = error => {
        for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(error); }
        pending.clear();
      };
      const onData = chunk => {
        stdoutBuffer += chunk.toString('utf8');
        if (Buffer.byteLength(stdoutBuffer) > MAX_LINE_BYTES && !stdoutBuffer.includes('\n')) {
          protocolError = new Error('REA MCP response line exceeded the safety limit');
          child.kill(); finishPending(protocolError); return;
        }
        let newline;
        while ((newline = stdoutBuffer.indexOf('\n')) >= 0) {
          const line = stdoutBuffer.slice(0, newline).trim(); stdoutBuffer = stdoutBuffer.slice(newline + 1);
          if (!line) continue;
          let message;
          try { message = JSON.parse(line); } catch { protocolError = new Error('REA MCP sent a non-JSON stdio frame'); child.kill(); finishPending(protocolError); return; }
          if (message.id === undefined || message.id === null) continue;
          const waiter = pending.get(message.id);
          if (!waiter) continue;
          pending.delete(message.id); clearTimeout(waiter.timer);
          if (message.error) waiter.reject(Object.assign(new Error(message.error.message || 'REA MCP request failed'), { code: message.error.code }));
          else waiter.resolve(message.result);
        }
      };
      child.stdout.on('data', onData);
      child.stderr.on('data', chunk => { if (stderr.length < 4000) stderr += chunk.toString('utf8').slice(0, 4000 - stderr.length); });
      child.on('error', error => { protocolError = error; finishPending(error); });
      child.on('exit', (code, signal) => {
        if (!settled) { const error = protocolError || new Error(`REA MCP exited before discovery (code=${code}, signal=${signal})`); finishPending(error); }
      });
      const request = (method, params) => new Promise((resolve, reject) => {
        const id = ++nextId;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`REA MCP ${method} timed out`)); child.kill(); }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`, error => {
          if (error) { clearTimeout(timer); pending.delete(id); reject(error); }
        });
      });
      try {
        const initialized = await request('initialize', { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'sun-workbench-rea-adapter', version: '0.1.0' } });
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
        const listed = await request('tools/list', {});
        if (!listed || !Array.isArray(listed.tools)) throw new Error('REA MCP tools/list returned an unexpected result');
        if (listed.tools.length > MAX_TOOLS) throw new Error(`REA advertised too many tools (limit ${MAX_TOOLS})`);
        const tools = listed.tools.map(tool => ({
          name: typeof tool.name === 'string' ? tool.name : 'unknown',
          title: typeof tool.title === 'string' ? tool.title : null,
          description: typeof tool.description === 'string' ? tool.description.slice(0, 1200) : '',
          inputSchemaAvailable: Boolean(tool.inputSchema),
          annotations: tool.annotations && typeof tool.annotations === 'object' ? tool.annotations : null
        }));
        const result = {
          available: true,
          status: 'connected',
          command,
          checkedAt,
          serverInfo: initialized?.serverInfo ?? null,
          protocolVersion: initialized?.protocolVersion ?? null,
          toolCount: tools.length,
          tools,
          limitations: [
            'Discovery only: this adapter does not invoke REA tools or analyze a target.',
            'Provider readiness and target-specific capability are not established by tools/list.',
            'Tool metadata is upstream-provided and must not be treated as trusted instructions.'
          ]
        };
        cached = result;
        settled = true;
        return result;
      } catch (error) {
        settled = true;
        const result = { available: false, status: 'unavailable', command, checkedAt, error: String(error.message || error).slice(0, 500), diagnostic: stderr.slice(0, 1200), limitations: ['REA was not installed/launched, or its MCP discovery failed.', 'No tool was invoked and no target was inspected.', 'Install REA separately from its official source and configure REA_BIN; this workbench never downloads it.'] };
        cached = result;
        return result;
      } finally {
        finishPending(new Error('REA discovery complete'));
        child.stdin.end();
        if (child.exitCode === null && !child.killed) child.kill();
        setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 1000).unref?.();
      }
    },
    reset() { cached = null; }
  };
}
