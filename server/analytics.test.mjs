import test from 'node:test';
import assert from 'node:assert/strict';
import { getOverview, queryAnalytics, getVehicleHistory, data } from './analytics.mjs';
import { askOpenAI, publicError } from './assistant.mjs';

test('control totals: 198 sales, 833 orders, separate paid / warranty / internal, 62 linked VINs', () => {
  const result = getOverview();
  assert.equal(result.sales.count, 198);
  assert.equal(result.sales.revenue, 592452496.12);
  assert.equal(result.sales.profit, 15653007.16);
  assert.equal(result.service.count, 833);
  assert.equal(result.service.paidCount, 600);
  assert.equal(result.service.warrantyCount, 108);
  assert.equal(result.service.internalCount, 125);
  assert.equal(result.linkedVehicles, 62);
  assert.equal(result.service.missingDatesCount, 19);
  assert.equal(result.service.lateCount, 36);
  assert.equal(result.service.lateShareOfDated, 4.42);
});
test('May and June remain separate and their counts reconcile', () => {
  const may = getOverview('2026-05');
  const june = getOverview('2026-06');
  assert.equal(may.sales.count, 82); assert.equal(june.sales.count, 116);
  assert.equal(may.service.count, 427); assert.equal(june.service.count, 406);
  assert.equal(may.sales.count + june.sales.count, getOverview().sales.count);
  assert.ok(may.sources.sales.every(name => /май/i.test(name)));
  assert.ok(june.sources.service.every(name => /июнь/i.test(name)));
});
test('i-space query handles model spelling and intersects warranty filter', () => {
  const result = queryAnalytics({ dataset: 'service', filters: [
    { field: 'model', op: 'contains', value: 'I SPACE' },
    { field: 'kind', op: 'eq', value: 'warranty' },
  ] });
  assert.equal(result.totals.count, 41);
  assert.equal(result.totals.uniqueVehicles, 30);
  assert.equal(result.totals.averageDurationDays, 0.8);
});
test('top-N truncation does not alter overall totals or ranking', () => {
  const result = queryAnalytics({ dataset: 'sales', groupBy: ['manager'], sortBy: 'profit', limit: 3 });
  assert.equal(result.totals.count, 198);
  assert.equal(result.groups.length, 3);
  assert.ok(result.truncated);
  assert.ok(result.groups[0].profit >= result.groups[1].profit);
});
test('missing durations stay absent instead of becoming zero', () => {
  const empty = queryAnalytics({ dataset: 'service', filters: [{ field: 'model', op: 'eq', value: 'does not exist' }] });
  assert.equal(empty.totals.count, 0);
  assert.equal(empty.totals.averageDurationDays, null);
  const result = queryAnalytics({ dataset: 'service', filters: [{ field: 'durationDays', op: 'lte', value: '0' }] });
  assert.equal(result.totals.count, data.serviceOrders.filter(row => row.durationDays === 0).length);
});
test('invalid fields, periods and limits are rejected', () => {
  assert.throws(() => queryAnalytics({ dataset: 'sales', groupBy: ['__proto__'] }));
  assert.throws(() => queryAnalytics({ dataset: 'sales', period: '2026-07' }));
  assert.throws(() => queryAnalytics({ dataset: 'sales', limit: 10000 }));
  assert.throws(() => getVehicleHistory({ search: '' }));
});
test('numeric equality preserves sign and decimal part; date ranges compare ISO dates', () => {
  const sale = data.sales.find(row => row.margin < 0);
  const negative = queryAnalytics({ dataset: 'sales', filters: [{ field: 'margin', op: 'eq', value: String(sale.margin) }] });
  const positive = queryAnalytics({ dataset: 'sales', filters: [{ field: 'margin', op: 'eq', value: String(-sale.margin) }] });
  assert.equal(negative.totals.count, data.sales.filter(row => row.margin === sale.margin).length);
  assert.equal(positive.totals.count, data.sales.filter(row => row.margin === -sale.margin).length);
  const range = queryAnalytics({ dataset: 'sales', filters: [
    { field: 'saleDate', op: 'gte', value: '2026-06-15' }, { field: 'saleDate', op: 'lte', value: '2026-06-30' },
  ] });
  assert.equal(range.totals.count, data.sales.filter(row => row.saleDate >= '2026-06-15' && row.saleDate <= '2026-06-30').length);
});
test('vehicle history returns only masked VINs and correct period', () => {
  const result = getVehicleHistory({ search: 'D3M0FWMPUUM6W9T5X', period: '2026-06' });
  assert.equal(result.foundVehicles, 1);
  assert.equal(result.vehicles[0].vinMasked, '…9T5X');
  assert.ok(result.vehicles[0].orders.every(order => order.date.startsWith('2026-06')));
  assert.ok(!JSON.stringify(result).includes('D3M0FWMPUUM6W9T5X'));
});
test('missing key stops before an API call; provider errors do not expose secrets', async () => {
  await assert.rejects(askOpenAI({ question: 'test', history: [], period: 'all', config: {} }), error => error.code === 'missing_api_key' && error.status === 503);
  const safe = publicError({ status: 401, message: 'secret text must not reach the user' });
  assert.equal(safe.code, 'invalid_api_key');
  assert.ok(!safe.message.includes('secret text'));
});

test('Responses API round trip executes local tool and returns structured answer (stub transport, no live API)', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    if (requests.length === 1) {
      assert.equal(body.store, false);
      assert.equal(body.tool_choice, 'auto');
      assert.equal(body.text.format.type, 'json_schema');
      return Response.json({ object: 'response', id: 'resp_local_1', status: 'completed', output: [{
        type: 'function_call', id: 'fc_local', call_id: 'call_local', name: 'query_analytics',
        arguments: JSON.stringify({ dataset: 'service', period: 'all', filters: [
          { field: 'model', op: 'contains', value: 'i-Space' }, { field: 'kind', op: 'eq', value: 'warranty' },
        ], groupBy: [], sortBy: 'count', direction: 'desc', limit: 10 }),
      }] });
    }
    const output = body.input.find(item => item.type === 'function_call_output');
    assert.equal(output.call_id, 'call_local');
    const local = JSON.parse(output.output);
    assert.equal(local.totals.count, 41);
    const answer = { kind: 'answer', title: 'i-Space', result: `${local.totals.count} гарантийных обращений.`, period: 'Май — июнь 2026', source: local.source.join(', '), filters: 'i-Space, гарантия', explanation: 'По строкам заказ-нарядов.' };
    return Response.json({ object: 'response', id: 'resp_local_2', status: 'completed', output: [{ type: 'message', id: 'msg_local', status: 'completed', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(answer), annotations: [] }] }] });
  };
  try {
    const answer = await askOpenAI({ question: 'Сколько гарантийных i-Space?', history: [], period: 'all', config: { OPENAI_API_KEY: 'sk-local-test-only-not-a-valid-key' } });
    assert.equal(requests.length, 2);
    assert.equal(answer.mode, 'api');
    assert.equal(answer.calculations[0].result.totals.count, 41);
    assert.match(answer.result, /41/);
  } finally { globalThis.fetch = originalFetch; }
});
