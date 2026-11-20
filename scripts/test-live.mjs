import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
let config = {};
for (const file of ['.env.local', '.env.deploy.local']) if (existsSync(file)) config = { ...config, ...parseEnv(readFileSync(file, 'utf8')) };
config = { ...config, ...process.env };
const origin = config.DEMO_URL || 'http://127.0.0.1:5182';
const headers = { 'Content-Type': 'application/json' };
const health = await fetch(`${origin}/api/health`).then(response => response.json());
if (!health.configured || health.mode !== 'api') throw new Error('Live assistant is not configured.');
if (health.requiresAccess) {
  const response = await fetch(`${origin}/api/session`, { method: 'POST', headers, body: JSON.stringify({ code: config.DEMO_ACCESS_CODE }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error);
  headers.Authorization = `Bearer ${payload.token}`;
}
const cases = [
  ['Сравни количество продаж в мае и июне.', answer => /82/.test(answer.result) && /116/.test(answer.result)],
  ['Сколько гарантийных обращений по i-Space за май–июнь и какой средний срок ремонта?', answer => /41/.test(answer.result) && /0[,.]8/.test(answer.result)],
];
for (const [question, check] of cases) {
  const response = await fetch(`${origin}/api/assistant`, { method: 'POST', headers, body: JSON.stringify({ question, history: [], period: 'all' }), signal: AbortSignal.timeout(95000) });
  const answer = await response.json();
  if (!response.ok || answer.mode !== 'api' || !check(answer)) throw new Error(answer.error || 'Unexpected answer');
  console.log(`PASS ${answer.model}: ${answer.result}`);
}
