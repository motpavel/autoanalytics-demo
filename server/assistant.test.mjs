import test from 'node:test';
import assert from 'node:assert/strict';
import { askOpenAI } from './assistant.mjs';

function responseFor(answer) {
  return Response.json({ object: 'response', id: 'resp_local', status: 'completed', output: [{
    type: 'message', id: 'msg_local', status: 'completed', role: 'assistant',
    content: [{ type: 'output_text', text: JSON.stringify(answer), annotations: [] }],
  }] });
}
const base = { title: 'Уточнение', period: 'Май — июнь 2026', source: '', filters: '', explanation: '' };
const config = { OPENAI_API_KEY: 'sk-local-test-only-not-a-valid-key' };

test('a clarification can be returned without fabricating a calculation', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return responseFor({ ...base, kind: 'clarification', result: 'Вы имеете в виду покупателей или менеджеров по продажам?' });
  };
  try {
    const answer = await askOpenAI({ question: 'Кто брал больше всего?', history: [], period: 'all', config });
    assert.equal(answer.kind, 'clarification');
    assert.equal(answer.calculations.length, 0);
    assert.match(answer.result, /покупателей.*менеджеров/);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test('numeric answers without calculations are still rejected; follow-up context is passed intact', async () => {
  const originalFetch = globalThis.fetch;
  const history = [
    { role: 'user', content: 'Кто брал больше всего?' },
    { role: 'assistant', content: 'Вы имеете в виду покупателей или менеджеров по продажам?' },
  ];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.deepEqual(body.input.slice(1, 3), history);
    assert.equal(body.input[3].content, 'Менеджеров, по количеству');
    return responseFor({ ...base, kind: 'answer', result: 'За май–июнь 2026 лидер продал 999 автомобилей.' });
  };
  try {
    await assert.rejects(askOpenAI({ question: 'Менеджеров, по количеству', history, period: 'all', config }), error => error.code === 'empty_answer');
  } finally { globalThis.fetch = originalFetch; }
});
