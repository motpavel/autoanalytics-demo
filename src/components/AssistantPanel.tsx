import { Bot, LoaderCircle, RotateCcw, Send, Sparkles } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { suggestedQuestions } from '../lib/assistant';
import { useAssistant } from '../lib/assistant-store';
import type { AssistantAnswer } from '../lib/types';
import type { PeriodId } from '../lib/view';
import { Panel } from './Panel';

type AssistantPanelProps = { compact?: boolean; period?: PeriodId };
function AnswerBlock({ answer }: { answer: AssistantAnswer }) {
  return <div className="assistant-answer" aria-label="Ответ ИИ-аналитика">
    <p className="assistant-answer__result">{answer.result}</p>
  </div>;
}
export function AssistantPanel({ compact = false, period = 'all' }: AssistantPanelProps) {
  const [question, setQuestion] = useState('');
  const [code, setCode] = useState('');
  const state = useAssistant();
  const inputId = useId();
  const log = useRef<HTMLDivElement>(null);
  const pending = Boolean(state.pendingQuestion);
  const locked = Boolean(state.health?.requiresAccess && !state.accessToken);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [state.messages, state.pendingQuestion, state.error]);
  function ask(text: string) { if (pending || locked || !text.trim()) return; setQuestion(''); void state.ask(text, period); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); ask(question); }
  const status = state.healthError ? 'Нет связи с сервером' : !state.health ? 'Подключаюсь…'
    : state.health.mode === 'mock' ? 'Демо без подключения ИИ'
    : !state.health.configured ? 'Ассистент пока не подключён' : null;
  const canReset = state.messages.length > 0 || pending || Boolean(state.error);
  return <Panel className={`assistant-panel ${compact ? 'assistant-panel--compact' : ''}`} title="ИИ-аналитик" action={<Sparkles size={18} aria-hidden="true" />}>
    <div className="assistant-panel__body">
      {status || canReset ? <div className="assistant-toolbar">{status ? <span className="assistant-status" role="status">{status}</span> : null}{canReset ? <button type="button" className="assistant-reset" onClick={state.reset}><RotateCcw size={13} /> Новый диалог</button> : null}</div> : null}
      <div className="assistant-conversation" ref={log} role="log" aria-label="Диалог с ИИ-аналитиком" aria-busy={pending}>
        {state.messages.length === 0 && !pending ? <div className="bot-row"><span className="bot-icon"><Bot size={18} aria-hidden="true" /></span><div className="bot-bubble">Спросите о продажах и сервисе за май–июнь 2026. Сравню показатели и помогу найти, на что обратить внимание. После ответа можно задать уточнение.</div></div> : null}
        {state.messages.map(message => <div className="assistant-turn" key={message.id}><div className="assistant-question"><span>Вы</span><p>{message.question}</p></div><AnswerBlock answer={message.answer} /></div>)}
        {pending ? <div className="assistant-turn"><div className="assistant-question"><span>Вы</span><p>{state.pendingQuestion}</p></div><div className="assistant-thinking" role="status"><LoaderCircle size={17} className="assistant-spinner" /> Анализирую данные…</div></div> : null}
        {state.error ? <div className="assistant-error" role="alert"><p>{state.error}</p><button type="button" disabled={pending} onClick={() => ask(state.failedQuestion)}>Повторить вопрос</button></div> : null}
      </div>
      {locked ? <form className="assistant-access-form" onSubmit={async event => { event.preventDefault(); if (await state.unlock(code)) setCode(''); }}>
        <label htmlFor={`${inputId}-access`}>Код доступа к ИИ</label>
        <p>Введите код демонстрации, чтобы задавать вопросы аналитику.</p>
        <div><input id={`${inputId}-access`} type="password" value={code} onChange={event => setCode(event.target.value)} autoComplete="current-password" maxLength={200} required /><button type="submit" disabled={state.unlocking || !code.trim()}>{state.unlocking ? 'Подключаю…' : 'Подключить'}</button></div>
        {state.accessError ? <p role="alert">{state.accessError}</p> : null}
      </form> : null}
      {!locked && state.messages.length === 0 && !pending ? <details className="assistant-suggestions" open><summary>Примеры вопросов</summary><div className="question-list">{suggestedQuestions.slice(0, compact ? suggestedQuestions.length : 4).map(item => <button className="question-button" key={item} type="button" onClick={() => ask(item)}><span>{item}</span><span aria-hidden="true">›</span></button>)}</div></details> : null}
      {!locked ? <form className="ask-form" onSubmit={submit}>
        <label className="assistant-sr-only" htmlFor={inputId}>Вопрос к ИИ-аналитику</label>
        <input id={inputId} value={question} onChange={event => setQuestion(event.target.value)} maxLength={2000} placeholder={state.messages.length ? 'Уточните ответ или задайте новый вопрос…' : 'Задайте свой вопрос…'} autoComplete="off" />
        <button aria-label="Задать вопрос" type="submit" disabled={pending || !question.trim()}><Send size={16} /></button>
      </form> : null}
    </div>
  </Panel>;
}
