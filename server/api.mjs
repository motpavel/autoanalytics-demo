import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { askOpenAI, AssistantError, mockAnswer, publicError } from './assistant.mjs';
import { data, periods } from './analytics.mjs';

const attempts = new Map();
let active = 0;
const sameSecret = (left, right) => timingSafeEqual(createHash('sha256').update(left).digest(), createHash('sha256').update(right).digest());

export function createDemoSession(code, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ expires: now + 7 * 24 * 60 * 60 * 1000, nonce: randomBytes(12).toString('hex') })).toString('base64url');
  return `${payload}.${createHmac('sha256', code).update(payload).digest('base64url')}`;
}
export function verifyDemoSession(token, code, now = Date.now()) {
  if (!token || !code || token.length > 1000) return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;
  const expected = createHmac('sha256', code).update(payload).digest('base64url');
  if (!sameSecret(signature, expected)) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).expires > now; } catch { return false; }
}

function rateLimit(key, maximum, windowMs) {
  const now = Date.now();
  if (attempts.size > 5000) for (const [entry, value] of attempts) if (value.expires <= now) attempts.delete(entry);
  let value = attempts.get(key);
  if (!value || value.expires <= now) { value = { count: 0, expires: now + windowMs }; attempts.set(key, value); }
  if (++value.count > maximum) throw new AssistantError(429, 'rate_limit', 'Слишком много запросов. Подождите несколько минут и повторите.');
}

function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(payload));
}
async function readBody(req) {
  let body = req.body;
  if (body === undefined) {
    body = '';
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 32768) throw new AssistantError(413, 'body_too_large', 'Сообщение слишком длинное.');
    }
  }
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > 32768) throw new AssistantError(413, 'body_too_large', 'Сообщение слишком длинное.');
    try { body = JSON.parse(body); } catch { throw new AssistantError(400, 'invalid_json', 'Не удалось прочитать запрос.'); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AssistantError(400, 'invalid_json', 'Не удалось прочитать запрос.');
  if (Buffer.byteLength(JSON.stringify(body)) > 32768) throw new AssistantError(413, 'body_too_large', 'Сообщение слишком длинное.');
  return body;
}

export async function handleApi(req, res, config = process.env) {
  try {
    const pathname = new URL(req.url, 'https://autoanalytics.invalid').pathname;
    const origin = req.headers.origin;
    const allowed = (config.ALLOWED_ORIGINS || 'http://127.0.0.1:5182,http://localhost:5182').split(',').map(value => value.trim());
    if (origin) {
      if (!allowed.includes(origin)) throw new AssistantError(403, 'invalid_origin', 'Запрос с этого сайта не разрешён.');
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
    const requiresAccess = Boolean(config.VERCEL || config.DEMO_ACCESS_CODE);
    if (pathname === '/api/health' && req.method === 'GET') {
      send(res, 200, {
        app: 'autoanalytics-web-demo', mode: config.AI_MODE === 'mock' ? 'mock' : 'api',
        configured: Boolean(config.OPENAI_API_KEY?.startsWith('sk-') && (!requiresAccess || config.DEMO_ACCESS_CODE)),
        model: config.OPENAI_MODEL || 'gpt-6.1-terra', requiresAccess,
        period: data.period, sales: data.sales.length, serviceOrders: data.serviceOrders.length,
      });
      return;
    }
    if (!['/api/session', '/api/assistant'].includes(pathname)) { send(res, 404, { error: 'Маршрут не найден.' }); return; }
    if (req.method !== 'POST') { send(res, 405, { error: 'Используйте POST.' }); return; }
    if (!req.headers['content-type']?.startsWith('application/json')) throw new AssistantError(415, 'invalid_content_type', 'Нужен запрос application/json.');
    if (requiresAccess && !config.DEMO_ACCESS_CODE) throw new AssistantError(503, 'setup_required', 'Ассистент ещё настраивается. Попробуйте позже.');
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (pathname === '/api/session') {
      rateLimit(`login:${ip}`, 12, 5 * 60 * 1000);
      const { code } = await readBody(req);
      if (typeof code !== 'string' || code.length > 200 || !config.DEMO_ACCESS_CODE || !sameSecret(code.trim(), config.DEMO_ACCESS_CODE)) throw new AssistantError(401, 'invalid_access_code', 'Код не подошёл. Проверьте код демонстрации и попробуйте ещё раз.');
      send(res, 200, { token: createDemoSession(config.DEMO_ACCESS_CODE) });
      return;
    }
    const authorization = req.headers.authorization || '';
    if (requiresAccess && !verifyDemoSession(authorization.startsWith('Bearer ') ? authorization.slice(7) : '', config.DEMO_ACCESS_CODE)) throw new AssistantError(401, 'demo_unauthorized', 'Введите код демонстрации, чтобы продолжить разговор с ИИ.');
    rateLimit(`assistant:${ip}`, 30, 10 * 60 * 1000);
    const { question, history = [], period = 'all' } = await readBody(req);
    if (typeof question !== 'string' || !question.trim() || question.length > 2000) throw new AssistantError(400, 'invalid_question', 'Введите вопрос длиной от 1 до 2000 символов.');
    if (!periods.includes(period)) throw new AssistantError(400, 'invalid_period', 'Неизвестный период.');
    if (!Array.isArray(history) || history.length > 8 || history.some(item => !item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || item.content.length > 6000)) throw new AssistantError(400, 'invalid_history', 'Начните новый диалог: история разговора слишком длинная.');
    if (active >= 3) throw new AssistantError(429, 'busy', 'Дождитесь завершения предыдущих вопросов и повторите.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    active++;
    try {
      const answer = config.AI_MODE === 'mock' ? mockAnswer(period) : await askOpenAI({ question: question.trim(), history, period, config, signal: controller.signal });
      // Only the answer is needed in the public browser; calculations stay on the server.
      send(res, 200, { kind: answer.kind, result: answer.result, mode: answer.mode, model: answer.model });
    } finally { active--; clearTimeout(timer); }
  } catch (error) {
    const safe = publicError(error);
    console.error(`[assistant] ${safe.code} (${safe.status})`);
    if (!res.destroyed) send(res, safe.status, { error: safe.message, code: safe.code });
  }
}
