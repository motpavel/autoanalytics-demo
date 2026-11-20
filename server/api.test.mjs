import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { handleApi, createDemoSession, verifyDemoSession } from './api.mjs';
import { data } from './analytics.mjs';

test('sessions reject altered, expired and missing credentials', () => {
  const token = createDemoSession('fixture-secret-demo', 1000);
  assert.equal(verifyDemoSession(token, 'fixture-secret-demo', 2000), true);
  assert.equal(verifyDemoSession(token, 'another-code', 2000), false);
  assert.equal(verifyDemoSession(token, 'fixture-secret-demo', 1000 + 8 * 86400000), false);
  assert.equal(verifyDemoSession(token + 'x', 'fixture-secret-demo', 2000), false);
  assert.equal(verifyDemoSession('', 'fixture-secret-demo'), false);
});
test('public data keeps control totals and replaces personal identifiers', () => {
  assert.equal(data.sales.length, 198);
  assert.equal(data.serviceOrders.length, 833);
  assert.equal(data.metrics.vinOverlapCount, 62);
  assert.ok(data.sales.every(row => !row.vin || row.vin.startsWith('D3M0')));
  assert.ok(data.serviceOrders.every(row => row.orderNumber.startsWith('ДЕМО-')));
  assert.ok(data.sales.every(row => row.manager.startsWith('Сотрудник ') || row.manager === 'Не указан'));
});
test('HTTP boundary enforces access and exact CORS origin, without exposing internal calculations', async () => {
  const config = { VERCEL: '1', DEMO_ACCESS_CODE: 'fixture-secret-demo', AI_MODE: 'mock', ALLOWED_ORIGINS: 'https://motpavel.github.io' };
  const server = createServer((req, res) => handleApi(req, res, config));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'Content-Type': 'application/json', Origin: 'https://motpavel.github.io' };
  try {
    const preflight = await fetch(base + '/api/assistant', { method: 'OPTIONS', headers });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), headers.Origin);
    const denied = await fetch(base + '/api/health', { headers: { Origin: 'https://example.com' } });
    assert.equal(denied.status, 403);
    const unauthorized = await fetch(base + '/api/assistant', { method: 'POST', headers, body: JSON.stringify({ question: 'Сколько продаж?' }) });
    assert.equal(unauthorized.status, 401);
    const login = await fetch(base + '/api/session', { method: 'POST', headers, body: JSON.stringify({ code: 'fixture-secret-demo' }) });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const answer = await fetch(base + '/api/assistant', { method: 'POST', headers: { ...headers, Authorization: `Bearer ${token}` }, body: JSON.stringify({ question: 'Сколько продаж?', period: 'all' }) });
    assert.equal(answer.status, 200);
    const payload = await answer.json();
    assert.equal(payload.mode, 'mock');
    assert.ok(payload.result.includes('198'));
    assert.equal('calculations' in payload, false);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
