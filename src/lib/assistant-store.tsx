import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { askAssistant, apiUrl, ApiError, openDemoSession } from './assistant';
import type { AssistantHealth } from './assistant';
import type { AssistantAnswer } from './types';
import type { PeriodId } from './view';

type Message = { id: number; question: string; answer: AssistantAnswer };
type AssistantState = {
  messages: Message[]; pendingQuestion: string; error: string; failedQuestion: string;
  health: AssistantHealth | null; healthError: boolean;
  accessToken: string; accessError: string; unlocking: boolean;
  unlock: (code: string) => Promise<boolean>;
  ask: (question: string, period: PeriodId) => Promise<void>; reset: () => void;
};
const Context = createContext<AssistantState | null>(null);
export function AssistantProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState('');
  const [error, setError] = useState('');
  const [failedQuestion, setFailedQuestion] = useState('');
  const [health, setHealth] = useState<AssistantHealth | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [accessToken, setAccessToken] = useState(() => { try { return localStorage.getItem('aa-demo-session-v1') || ''; } catch { return ''; } });
  const [accessError, setAccessError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const messageRef = useRef<Message[]>([]);
  const sequence = useRef(0);
  useEffect(() => {
    const healthController = new AbortController();
    async function refresh() {
      try {
        const response = await fetch(apiUrl('/api/health'), { signal: healthController.signal });
        if (!response.ok) throw new Error();
        const payload = await response.json() as AssistantHealth;
        if (healthController.signal.aborted) return;
        setHealth(payload); setHealthError(false);
      } catch { if (!healthController.signal.aborted) setHealthError(true); }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 10_000);
    return () => { healthController.abort(); window.clearInterval(interval); };
  }, []);
  useEffect(() => () => { controller.current?.abort(); }, []);
  useEffect(() => {
    try { if (accessToken) localStorage.setItem('aa-demo-session-v1', accessToken); else localStorage.removeItem('aa-demo-session-v1'); } catch { /* Optional browser storage. */ }
  }, [accessToken]);
  const unlock = useCallback(async (code: string) => {
    setUnlocking(true); setAccessError('');
    try { setAccessToken(await openDemoSession(code.trim())); return true; }
    catch (cause) { setAccessError(cause instanceof Error ? cause.message : 'Не удалось подключиться. Повторите попытку.'); return false; }
    finally { setUnlocking(false); }
  }, []);
  useEffect(() => {
    const invite = new URLSearchParams(window.location.hash.slice(1)).get('demo');
    if (!invite) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    void unlock(invite);
  }, [unlock]);
  const reset = useCallback(() => {
    sequence.current++; controller.current?.abort(); controller.current = null;
    messageRef.current = []; setMessages([]); setPendingQuestion(''); setError(''); setFailedQuestion('');
  }, []);
  const ask = useCallback(async (question: string, period: PeriodId) => {
    const trimmed = question.trim();
    if (!trimmed || controller.current) return;
    const request = new AbortController(); controller.current = request;
    const id = ++sequence.current;
    const history = messageRef.current.slice(-4).flatMap(message => [
      { role: 'user' as const, content: message.question },
      { role: 'assistant' as const, content: message.answer.result.slice(0, 6000) },
    ]);
    setPendingQuestion(trimmed); setError(''); setFailedQuestion('');
    const timeout = window.setTimeout(() => request.abort(), 95_000);
    try {
      const answer = await askAssistant(trimmed, history, period, request.signal, accessToken);
      if (sequence.current !== id) return;
      messageRef.current = [...messageRef.current, { id, question: trimmed, answer }].slice(-12);
      setMessages(messageRef.current);
    } catch (cause) {
      if (sequence.current !== id) return;
      if (cause instanceof ApiError && cause.code === 'demo_unauthorized') { setAccessToken(''); setAccessError('Введите код демонстрации ещё раз.'); }
      setError(request.signal.aborted ? 'Время ожидания истекло. Повторите вопрос.' : cause instanceof Error ? cause.message : 'Нет связи с локальным сервером. Проверьте, что окно демо запущено.');
      setFailedQuestion(trimmed);
    } finally {
      window.clearTimeout(timeout);
      if (sequence.current === id) { controller.current = null; setPendingQuestion(''); }
    }
  }, [accessToken]);
  return <Context.Provider value={{ messages, pendingQuestion, error, failedQuestion, health, healthError, accessToken, accessError, unlocking, unlock, ask, reset }}>{children}</Context.Provider>;
}
export function useAssistant() {
  const context = useContext(Context);
  if (!context) throw new Error('AssistantProvider is required.');
  return context;
}
