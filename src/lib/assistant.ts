import type { AssistantAnswer } from './types';
import type { PeriodId } from './view';

export const suggestedQuestions = [
  'Сравни продажи в мае и июне: количество, выручка и маржа.',
  'Кто лидер по количеству продаж, а кто по марже? Покажи топ-3.',
  'Сколько гарантийных обращений было по i-Space и какой средний срок ремонта?',
  'Какие модели чаще не укладывались в срок? Покажи топ-5.',
  'Сколько было платных, гарантийных и внутренних заказ-нарядов?',
  'Сколько автомобилей из продаж нашли в сервисе по VIN?',
  'Какие продажи были с отрицательной маржой и что проверить руководителю?',
  'Какие три показателя требуют внимания руководителя?',
  'Можно ли по этим данным рассчитать конверсию из лида в продажу?',
];
export type AssistantHealth = { app: string; mode: 'api' | 'mock'; configured: boolean; model: string; sales: number; serviceOrders: number; requiresAccess: boolean };
export const apiUrl = (path: string) => `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}${path}`;
export class ApiError extends Error {
  constructor(message: string, readonly code: string) { super(message); }
}
export async function openDemoSession(code: string): Promise<string> {
  const response = await fetch(apiUrl('/api/session'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
  const payload = await response.json();
  if (!response.ok) throw new ApiError(payload.error || 'Не удалось подключиться. Повторите попытку.', payload.code);
  return payload.token;
}
export async function askAssistant(question: string, history: Array<{ role: 'user' | 'assistant'; content: string }>, period: PeriodId, signal: AbortSignal, token: string): Promise<AssistantAnswer> {
  const response = await fetch(apiUrl('/api/assistant'), {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ question, history, period }), signal,
  });
  const payload = await response.json();
  if (!response.ok) throw new ApiError(payload.error || 'Не удалось получить ответ. Повторите вопрос.', payload.code);
  return payload as AssistantAnswer;
}
