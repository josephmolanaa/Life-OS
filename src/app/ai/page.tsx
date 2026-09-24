"use client";

import { useState, useEffect } from 'react';
import { Shell } from '@/components/finance/layout';
import { Bot, Send, User, Sparkles } from 'lucide-react';
import { getLang, copy, type Lang, type Translation } from '@/lib/i18n';

export default function AiPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [t, setT] = useState<Translation>(copy.en);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Halo! Saya AI Life Assistant kamu. Ada yang bisa saya bantu dengan analisis progres pilar hidupmu hari ini?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  useEffect(() => {
    getLang().then(l => {
      setLang(l);
      setT(copy[l]);
    });
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isAiThinking) return;

    const userText = inputMessage;
    setInputMessage('');
    const newMessages = [...messages, { role: 'user' as const, content: userText }];
    setMessages(newMessages);
    setIsAiThinking(true);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: "User is on a dedicated AI support page. They want a deep dive into their Life OS data."
        })
      });

      if (res.ok) {
        const reply = await res.json();
        setMessages([...newMessages, reply]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: 'Format respons AI terhubung. Silakan masukkan token FreeLLMAPI di `.env.local`.' }]);
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Sistem AI sedang offline. Silakan coba beberapa saat lagi.' }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  return (
    <Shell title={t.aiAssistant} quickFab={false}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 180px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'var(--accent)', color: 'var(--accentText)', padding: '10px', borderRadius: '12px' }}>
              <Bot size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{t.aiAssistant}</h2>
              <small className="muted">{t.aiMemoryNote}</small>
            </div>
          </div>
          <span className="pill" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={12} className="positive" /> FreeLLMAPI Active
          </span>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: 'var(--surface2)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border2)'
        }}>
          {messages.map((m, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              {m.role === 'assistant' && <Bot size={18} style={{ marginTop: '6px' }} className="muted" />}
              <div style={{
                background: m.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                color: m.role === 'user' ? 'var(--accentText)' : 'var(--text)',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '14px',
                lineHeight: '1.5',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {m.content}
              </div>
              {m.role === 'user' && <User size={18} style={{ marginTop: '6px' }} className="muted" />}
            </div>
          ))}
          {isAiThinking && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="muted">
              <Bot size={16} className="animate-spin" />
              <small style={{ fontStyle: 'italic' }}>AI sedang menganalisis data...</small>
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="input"
            style={{ padding: '14px 18px', fontSize: '14px' }}
            placeholder={t.aiPlaceholder}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
          />
          <button className="btn" type="submit" disabled={isAiThinking} style={{ width: '54px', height: '54px', borderRadius: '12px' }}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </Shell>
  );
}
