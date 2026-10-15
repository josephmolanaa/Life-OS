'use client';

import Link from 'next/link';
import { Bot, Check, Copy, Minus, RotateCcw, Send, Sparkles, Square } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAiSettings } from './ai-settings';
import { aiProviders, trimAiMessages, type ChatMessage } from '@/lib/ai-config';
import { getLang, type Lang } from '@/lib/i18n';

type ReviewScope = 'finance' | 'habits' | 'career' | 'physique' | 'social';
type ReviewOptions = { days: 7 | 30; scopes: ReviewScope[] };

const scopeLabels: Record<ReviewScope, { en: string; id: string }> = {
  habits: { en: 'Habits', id: 'Kebiasaan' }, career: { en: 'Career', id: 'Karier' }, finance: { en: 'Finance', id: 'Keuangan' }, physique: { en: 'Physique', id: 'Fisik' }, social: { en: 'Social', id: 'Sosial' },
};
const defaultReview: ReviewOptions = { days: 30, scopes: [] };

export function FloatingAiChat() {
  const { userId, config } = useAiSettings();
  return <AiChat key={`${userId}:${config.provider}:${config.baseUrl}:${config.model}`} userId={userId} />;
}

function MarkdownMessage({ content }: { content: string }) {
  const inline = (text: string): ReactNode => <>{text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith('`') ? <code key={index}>{part.slice(1, -1)}</code> : part.startsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part)}</>;
  return <>{content.split(/```/).map((block, index) => {
    if (index % 2) return <pre key={index}><code>{block.trim()}</code></pre>;
    return block.split(/\n{2,}/).filter(Boolean).map((paragraph, nestedIndex) => {
      const lines = paragraph.split('\n');
      if (lines.every((line) => /^[-*]\s+/.test(line))) return <ul key={`${index}-${nestedIndex}`}>{lines.map((line, lineIndex) => <li key={lineIndex}>{inline(line.replace(/^[-*]\s+/, ''))}</li>)}</ul>;
      const heading = lines[0]?.match(/^#{1,3}\s+(.+)/);
      if (heading) return <strong key={`${index}-${nestedIndex}`}>{inline(heading[1])}</strong>;
      return <p key={`${index}-${nestedIndex}`}>{lines.map((line, lineIndex) => <span key={lineIndex}>{inline(line)}{lineIndex < lines.length - 1 && <br />}</span>)}</p>;
    });
  })}</>;
}

function AiChat({ userId }: { userId: string | null }) {
  const { config, apiKey, hasKey, ready } = useAiSettings();
  const [lang, setLang] = useState<Lang>('en');
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (!userId) return [];
    try {
      const saved = JSON.parse(localStorage.getItem(`lifeos-ai-chat-${userId}`) || '[]');
      return Array.isArray(saved) ? trimAiMessages(saved.filter((message): message is ChatMessage => message && (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string' && !!message.content.trim())) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [review, setReview] = useState<ReviewOptions>(defaultReview);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const id = lang === 'id';
  const historyKey = userId ? `lifeos-ai-chat-${userId}` : null;

  useEffect(() => { getLang().then(setLang); return () => requestRef.current?.abort(); }, []);
  useEffect(() => { if (historyKey) localStorage.setItem(historyKey, JSON.stringify(trimAiMessages(messages))); }, [historyKey, messages]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages, busy, open]);
  useEffect(() => {
    if (!open && wasOpen.current) launcherRef.current?.focus();
    wasOpen.current = open;
    if (!open) return;
    inputRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  async function send(text: string, reviewProgress = false, history = messages) {
    const content = text.trim();
    if (!content || requestRef.current || !hasKey || !ready) return;
    const next = [...history, { role: 'user' as const, content }];
    const controller = new AbortController();
    requestRef.current = controller;
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setError('');
    setBusy(true);
    let received = false;
    try {
      const response = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60_000)]),
        body: JSON.stringify({ config, apiKey, messages: trimAiMessages(next), reviewProgress: reviewProgress ? review : false }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(typeof data?.error === 'string' ? data.error : 'AI request failed');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      while (true) {
        const { done, value } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const lines = pending.split('\n');
        pending = lines.pop() ?? '';
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line) as { delta?: unknown; error?: unknown };
          if (typeof event.error === 'string') throw new Error(event.error);
          if (typeof event.delta === 'string') {
            received = true;
            setMessages((current) => [...current.slice(0, -1), { role: 'assistant', content: `${current.at(-1)?.content ?? ''}${event.delta}`.slice(0, 8000) }]);
          }
        }
        if (done) break;
      }
      if (!received) throw new Error('Empty AI response');
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (!received) { setMessages(history); setInput(content); }
        setError(failure instanceof Error ? failure.message : (id ? 'AI tidak tersedia. Coba lagi.' : 'AI unavailable. Please retry.'));
      }
    } finally {
      requestRef.current = null;
      setBusy(false);
    }
  }

  function retry() {
    const userIndex = messages.map((message) => message.role).lastIndexOf('user');
    if (userIndex < 0) return;
    const retryMessage = messages[userIndex].content;
    const history = messages.slice(0, userIndex);
    setMessages(history);
    void send(retryMessage, false, history);
  }

  async function copy(content: string, index: number) {
    try { await navigator.clipboard.writeText(content); setCopied(index); window.setTimeout(() => setCopied(null), 1600); } catch { setError(id ? 'Gagal menyalin respons.' : 'Could not copy response.'); }
  }

  return <>
    <button ref={launcherRef} className="floatingAiButton" style={{ display: open ? 'none' : undefined }} type="button" aria-label={id ? 'Buka chat AI' : 'Open AI chat'} aria-controls={open ? 'floating-ai-panel' : undefined} aria-expanded={open} onClick={() => setOpen(true)}><Bot size={22} aria-hidden="true" /></button>
    {open && <section id="floating-ai-panel" className="floatingAiPanel" role="dialog" aria-modal="false" aria-labelledby="floating-ai-title" aria-busy={busy}>
      <header className="floatingAiHeader" style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--surface)' }}>
        <div className="floatingAiTitle"><span><Bot size={18} aria-hidden="true" /></span><div><h2 id="floating-ai-title">Life OS AI</h2><small>{hasKey ? config.model : (id ? 'API key belum diatur' : 'API key not set')}</small></div></div>
        <div className="floatingAiControls">
          <button type="button" className="iconBtn" aria-label={id ? 'Minimalkan chat AI' : 'Minimize AI chat'} onClick={() => setOpen(false)}><Minus size={16} aria-hidden="true" /></button>
          <button type="button" className="iconBtn" disabled={busy} aria-label={id ? 'Reset chat AI' : 'Reset AI chat'} onClick={() => { setMessages([]); setError(''); setInput(''); if (historyKey) localStorage.removeItem(historyKey); }}><RotateCcw size={16} aria-hidden="true" /></button>
        </div>
      </header>
      <div className="floatingAiMessages" ref={listRef} role="log" aria-label={id ? 'Percakapan AI' : 'AI conversation'} aria-live="polite">
        {!hasKey && ready && <div className="floatingAiNotice"><b>{id ? 'Hubungkan provider dulu.' : 'Connect a provider first.'}</b><span>{id ? 'Buka Settings untuk simpan API key.' : 'Open Settings to save an API key.'}</span><Link className="btn ghost" href="/settings" onClick={() => setOpen(false)}>{id ? 'Buka Settings' : 'Open Settings'}</Link></div>}
        {!messages.length && <p className="floatingAiBubble assistant">{id ? 'Tanya apa saja, atau review progres Life OS kamu.' : 'Ask anything, or review your Life OS progress.'}</p>}
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`floatingAiBubble ${message.role}`}><span className="srOnly">{message.role === 'user' ? (id ? 'Kamu: ' : 'You: ') : 'AI: '}</span>{message.role === 'assistant' ? <MarkdownMessage content={message.content} /> : message.content}{message.role === 'assistant' && message.content && <button type="button" className="floatingAiCopy" onClick={() => void copy(message.content, index)} aria-label={id ? 'Salin respons AI' : 'Copy AI response'}>{copied === index ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}{copied === index ? (id ? 'Tersalin' : 'Copied') : (id ? 'Salin' : 'Copy')}</button>}</div>)}
        {busy && <div className="floatingAiThinking" role="status" aria-live="polite"><span className="loadingLine" aria-hidden="true" />{id ? 'Menjawab…' : 'Responding…'}</div>}
      </div>
      <form className="floatingAiForm" onSubmit={(event) => { event.preventDefault(); void send(input); }}>
        {error && <div className="aiChatError" role="alert" aria-live="assertive"><span>{error}</span><button type="button" className="btn ghost" onClick={retry}>{id ? 'Coba lagi' : 'Retry'}</button></div>}
        <details className="aiReviewOptions"><summary>{id ? `Review ${review.days} hari · ${review.scopes.length} data` : `${review.days}-day review · ${review.scopes.length} data areas`}</summary><div><label htmlFor="ai-review-days">{id ? 'Periode' : 'Period'}</label><select id="ai-review-days" className="input" value={review.days} onChange={(event) => setReview((current) => ({ ...current, days: Number(event.target.value) as 7 | 30 }))}><option value={7}>7 {id ? 'hari' : 'days'}</option><option value={30}>30 {id ? 'hari' : 'days'}</option></select><fieldset><legend>{id ? 'Data yang dikirim' : 'Data to share'}</legend>{(Object.keys(scopeLabels) as ReviewScope[]).map((scope) => <label key={scope}><input type="checkbox" checked={review.scopes.includes(scope)} onChange={() => setReview((current) => ({ ...current, scopes: current.scopes.includes(scope) ? current.scopes.filter((item) => item !== scope) : [...current.scopes, scope] }))} />{scopeLabels[scope][id ? 'id' : 'en']}</label>)}</fieldset></div></details>
        <small className="muted">{id ? 'Review hanya mengirim data yang dicentang ke ' : 'Review sends only checked data to '}{aiProviders[config.provider].label}.</small>
        <div className="floatingAiActions"><button type="button" className="btn ghost floatingAiReview" disabled={!ready || !hasKey || busy || !review.scopes.length} onClick={() => void send(id ? 'Review progres saya. Jelaskan tren, anomali bila ada, lalu 3 prioritas berikutnya.' : 'Review my progress. Explain trends, evidence-based anomalies, then 3 next priorities.', true)}><Sparkles size={14} aria-hidden="true" />{id ? 'Review progres' : 'Review progress'}</button>{busy && <button type="button" className="btn ghost" onClick={() => requestRef.current?.abort()}><Square size={13} aria-hidden="true" />{id ? 'Berhenti' : 'Stop'}</button>}</div>
        <div className="floatingAiInputRow">
          <label className="srOnly" htmlFor="floating-ai-input">{id ? 'Pesan untuk AI' : 'Message AI'}</label>
          <textarea ref={inputRef} id="floating-ai-input" className="input" rows={1} value={input} onChange={(event) => setInput(event.target.value)} placeholder={id ? 'Tanya AI…' : 'Ask AI…'} maxLength={4000} />
          <button className="btn floatingAiSend" aria-label={id ? 'Kirim pesan' : 'Send message'} disabled={!ready || !hasKey || busy || !input.trim()}><Send size={16} aria-hidden="true" /></button>
        </div>
      </form>
    </section>}
  </>;
}
