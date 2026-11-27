// Local agent board: turns recorded hook events into live node states. Binds to loopback only.
// Ported from I:\Game_AI (2026-11-27). Difference: no fixed team; the main session is one node and every
// subagent type that shows up in the events gets its own node.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = join(resolve(HERE, '..', '..'), '.agent-board', 'events.jsonl');
const PORT = Number(process.env.AGENT_BOARD_PORT ?? 5181);
const POLL_MS = 500;
const REFRESH_MS = 15_000;
const STALE_MS = 10 * 60_000;
const LOG_SIZE = 40;
const MAIN = 'main';

function readEvents() {
  if (!existsSync(FILE)) return [];
  return readFileSync(FILE, 'utf8').split('\n').flatMap((line) => {
    try {
      return line ? [JSON.parse(line)] : [];
    } catch {
      return [];
    }
  }).sort((a, b) => a.ts - b.ts);
}

export function buildState(events, now = Date.now()) {
  const nodes = {};
  const node = (role) => (nodes[role] ??= {
    status: 'idle', action: '', tools: 0, active: new Set(), since: null, lastTs: null, lastError: '',
  });
  node(MAIN);
  const roleOfAgent = new Map();
  const log = [];

  for (const e of events) {
    if (e.agentId && e.agentType) roleOfAgent.set(e.agentId, e.agentType);
    const role = e.agentId ? roleOfAgent.get(e.agentId) ?? e.agentType : MAIN;
    if (!role) continue;
    const n = node(role);
    const label = [e.tool, e.target].filter(Boolean).join(': ');
    const begin = (action) => {
      if (n.status !== 'working') n.since = e.ts;
      n.status = 'working';
      n.action = action;
    };
    let text = '';

    if (e.event === 'SubagentStart') {
      n.active.add(e.agentId);
      begin('Bắt đầu việc');
      n.lastError = '';
      text = 'Bắt đầu việc';
    } else if (e.event === 'SubagentStop') {
      n.active.delete(e.agentId);
      if (n.active.size === 0) {
        n.status = 'done';
        n.action = 'Đã xong';
      }
      text = 'Đã xong';
    } else if (e.event === 'UserPromptSubmit') {
      begin('Nhận yêu cầu');
      n.lastError = '';
      text = 'Nhận yêu cầu';
    } else if (e.event === 'Stop') {
      n.status = 'idle';
      n.action = 'Chờ yêu cầu';
      text = 'Chờ yêu cầu';
    } else if (e.event === 'PreToolUse') {
      begin(label);
      n.tools += 1;
      text = label;
    } else if (e.event === 'PostToolUseFailure') {
      n.lastError = label;
      text = `Lỗi: ${label}`;
    }
    n.lastTs = e.ts;
    if (text) log.push({ ts: e.ts, role, text, error: e.event === 'PostToolUseFailure' });
  }

  for (const n of Object.values(nodes)) {
    n.running = n.active.size;
    delete n.active;
    if (n.status === 'working' && now - n.lastTs > STALE_MS) n.status = 'stale';
  }
  // Main session first, then subagent types by most recent activity.
  const order = [MAIN, ...Object.keys(nodes).filter((r) => r !== MAIN)
    .sort((a, b) => (nodes[b].lastTs ?? 0) - (nodes[a].lastTs ?? 0))];
  return { now, order, nodes, log: log.slice(-LOG_SIZE).reverse() };
}

const clients = new Set();
const payload = () => `data: ${JSON.stringify(buildState(readEvents()))}\n\n`;
const broadcast = () => {
  if (clients.size === 0) return;
  const data = payload();
  for (const client of clients) client.write(data);
};

let lastStamp = '';
setInterval(() => {
  const stat = existsSync(FILE) ? statSync(FILE) : null;
  const stamp = stat ? `${stat.size}:${stat.mtimeMs}` : '';
  if (stamp !== lastStamp) {
    lastStamp = stamp;
    broadcast();
  }
}, POLL_MS);
setInterval(broadcast, REFRESH_MS);

createServer((req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  if (path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(readFileSync(join(HERE, 'index.html')));
  } else if (path === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(payload());
    clients.add(res);
    req.on('close', () => clients.delete(res));
  } else {
    res.writeHead(404).end();
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Agent board: http://127.0.0.1:${PORT}`));
