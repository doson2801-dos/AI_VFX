// Claude Code hook: appends one short activity event for the agent board.
// Stores tool names and short targets only, never prompts, file contents or full commands.
// Must never disturb the session, so every failure exits 0.
import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = join(ROOT, '.agent-board');
const FILE = join(DIR, 'events.jsonl');
const MAX_BYTES = 1_000_000;
const MAX_TARGET = 70;

const short = (text) => (text.length > MAX_TARGET ? `${text.slice(0, MAX_TARGET - 1)}…` : text);

function describe(input = {}) {
  if (input.file_path) {
    const path = relative(ROOT, resolve(ROOT, input.file_path)).replaceAll('\\', '/');
    return short(path.startsWith('..') ? input.file_path.split(/[\\/]/).pop() : path);
  }
  if (input.subagent_type) return short(`${input.subagent_type}: ${input.description ?? ''}`);
  if (input.description) return short(input.description);
  if (input.skill) return short(input.skill);
  if (input.pattern) return short(input.pattern);
  if (input.command) return short(input.command.trim().split(/\s+/)[0]);
  return '';
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    const hook = JSON.parse(raw);
    const event = {
      ts: Date.now(),
      event: hook.hook_event_name,
      session: hook.session_id,
      agentId: hook.agent_id,
      agentType: hook.agent_type,
      tool: hook.tool_name,
      target: describe(hook.tool_input),
    };
    mkdirSync(DIR, { recursive: true });
    try {
      if (statSync(FILE).size > MAX_BYTES) renameSync(FILE, join(DIR, 'events.old.jsonl'));
    } catch { /* first event */ }
    appendFileSync(FILE, `${JSON.stringify(event)}\n`);
  } catch { /* never block the session */ }
  process.exit(0);
});
