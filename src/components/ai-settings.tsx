'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { aiProviders, defaultAiConfig, isAiProvider, type AiConfig, type AiProviderId } from '@/lib/ai-config';

declare global {
  interface Window {
    lifeOsSecureStorage?: {
      encrypt(value: string): Promise<string>;
      decrypt(value: string): Promise<string>;
    };
  }
}

type SavedSettings = { config: AiConfig; encryptedKey?: string };
type AiSettingsContextValue = {
  userId: string | null;
  config: AiConfig;
  apiKey: string;
  hasKey: boolean;
  ready: boolean;
  save: (config: AiConfig, key: string) => Promise<void>;
  clearKey: () => void;
};

const AiSettingsContext = createContext<AiSettingsContextValue | null>(null);

export function useAiSettings() {
  const value = useContext(AiSettingsContext);
  if (!value) throw new Error('useAiSettings requires AiSettingsProvider');
  return value;
}

export function AiSettingsProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let authChanged = false;
    supabase.auth.getUser().then(({ data }) => { if (active && !authChanged) setUserId(data.user?.id ?? null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authChanged = true;
      setUserId(session?.user.id ?? null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  return <UserAiSettings key={userId} userId={userId}>{children}</UserAiSettings>;
}

function UserAiSettings({ userId, children }: { userId: string | null; children: React.ReactNode }) {
  const [saved] = useState<SavedSettings>(() => {
    if (!userId) return { config: defaultAiConfig };
    try {
      const value = JSON.parse(localStorage.getItem(`lifeos-ai-${userId}`) || 'null') as SavedSettings | null;
      if (value && isAiProvider(value.config?.provider)) return {
        config: {
          provider: value.config.provider,
          model: typeof value.config.model === 'string' ? value.config.model : '',
          baseUrl: typeof value.config.baseUrl === 'string' ? value.config.baseUrl : aiProviders[value.config.provider].baseUrl,
        },
        encryptedKey: typeof value.encryptedKey === 'string' ? value.encryptedKey : undefined,
      };
    } catch { /* Invalid browser settings fall back to defaults. */ }
    return { config: defaultAiConfig };
  });
  const [config, setConfig] = useState(saved.config);
  const [apiKey, setApiKey] = useState('');
  const [ready, setReady] = useState(!saved.encryptedKey);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    let cancelled = false;
    if (saved.encryptedKey) {
      const decrypted = window.lifeOsSecureStorage?.decrypt(saved.encryptedKey) ?? Promise.resolve('');
      decrypted.then(key => { if (!cancelled) setApiKey(key); }).catch(() => {
        if (!cancelled && userId) localStorage.removeItem(`lifeos-ai-${userId}`);
      }).finally(() => { if (!cancelled) setReady(true); });
    }
    return () => { cancelled = true; active.current = false; };
  }, [saved, userId]);

  async function save(nextConfig: AiConfig, nextKey: string) {
    if (!userId) throw new Error('Sign in before saving AI settings.');
    const sameConnection = config.provider === nextConfig.provider && config.baseUrl === nextConfig.baseUrl;
    const key = nextKey.trim() || (sameConnection ? apiKey : '');
    if (!nextConfig.model.trim() || !nextConfig.baseUrl.trim() || !key) throw new Error('Model, API base URL, and API key are required.');
    const url = new URL(nextConfig.baseUrl.trim());
    if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw new Error('Use HTTPS, or HTTP on localhost.');
    if (key.length > 512 || /[\r\n]/.test(key)) throw new Error('Invalid API key');
    const saved: SavedSettings = { config: { ...nextConfig, model: nextConfig.model.trim(), baseUrl: nextConfig.baseUrl.trim() } };
    if (window.lifeOsSecureStorage) saved.encryptedKey = await window.lifeOsSecureStorage.encrypt(key);
    if (!active.current) throw new Error('Account changed. Please sign in again.');
    localStorage.setItem(`lifeos-ai-${userId}`, JSON.stringify(saved));
    setConfig(saved.config);
    setApiKey(key);
  }

  function clearKey() {
    setApiKey('');
    if (!userId) return;
    localStorage.setItem(`lifeos-ai-${userId}`, JSON.stringify({ config } satisfies SavedSettings));
  }

  const value = { userId, config, apiKey, hasKey: !!apiKey, ready, save, clearKey };
  return <AiSettingsContext.Provider value={value}>{children}</AiSettingsContext.Provider>;
}

export function AiProviderSettings({ lang }: { lang: 'en' | 'id' }) {
  const { userId, config, hasKey, ready } = useAiSettings();
  return <AiProviderForm key={`${userId}:${ready}:${hasKey}:${JSON.stringify(config)}`} lang={lang} />;
}

function AiProviderForm({ lang }: { lang: 'en' | 'id' }) {
  const { config, apiKey: savedApiKey, hasKey, ready, save, clearKey } = useAiSettings();
  const [provider, setProvider] = useState<AiProviderId>(config.provider);
  const [model, setModel] = useState(config.model);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [key, setKey] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [connectionState, setConnectionState] = useState<'idle' | 'connected' | 'error'>(hasKey && !!config.model ? 'connected' : 'idle');

  function changeProvider(next: AiProviderId) {
    setProvider(next);
    setModel('');
    setBaseUrl(aiProviders[next].baseUrl);
    setKey('');
    setNotice('');
    setModels([]);
    setConnectionState('idle');
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setNotice('');
    try {
      await save({ provider, model, baseUrl }, key);
      setConnectionState('connected');
      setKey('');
      setNotice(lang === 'id' ? 'Pengaturan AI tersimpan.' : 'AI settings saved.');
    } catch (error) {
      setConnectionState('error');
      setNotice(error instanceof Error ? error.message : 'Could not save AI settings.');
    } finally {
      setIsSaving(false);
    }
  }

  async function checkConnection() {
    const apiKey = key.trim() || (provider === config.provider && baseUrl === config.baseUrl ? savedApiKey : '');
    if (!apiKey || !baseUrl.trim()) { setNotice(lang === 'id' ? 'Isi API key dan base URL terlebih dahulu.' : 'Enter an API key and base URL first.'); return; }
    setIsChecking(true);
    setNotice('');
    setModels([]);
    setConnectionState('idle');
    try {
      const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'models', config: { provider, model, baseUrl }, apiKey }) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Connection test failed.');
      const discovered = Array.isArray(data.models) ? data.models.filter((item: unknown): item is string => typeof item === 'string') : [];
      setModels(discovered);
      if (!model.trim()) throw new Error(lang === 'id' ? 'Pilih atau isi Model ID terlebih dahulu.' : 'Choose or enter a Model ID first.');
      if (discovered.length && !discovered.includes(model.trim())) throw new Error(lang === 'id' ? 'Model ID tidak tersedia pada provider ini.' : 'Model ID is not available from this provider.');
      const test = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test', config: { provider, model, baseUrl }, apiKey }) });
      const result = await test.json();
      if (!test.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Connection test failed.');
      setNotice(`${lang === 'id' ? 'Koneksi dan model berhasil' : 'Connection and model successful'} · ${result.latencyMs} ms${discovered.length ? ` · ${discovered.length} ${lang === 'id' ? 'model ditemukan' : 'models found'}` : ''}`);
    } catch (error) {
      setConnectionState('error');
      setNotice(error instanceof Error ? error.message : (lang === 'id' ? 'Koneksi gagal.' : 'Connection failed.'));
    } finally { setIsChecking(false); }
  }

  const id = lang === 'id';
  const providerEntries = (['openai', 'anthropic', '9router'] as AiProviderId[]).map((providerId) => [providerId, aiProviders[providerId]] as const);
  const providerName = aiProviders[config.provider]?.label ?? config.provider;

  return <section className="card aiSettingsCard aiConnectionCard" aria-labelledby="ai-settings-title">
    <div className="settingsSectionHeader">
      <div><span className="pill">AI & API</span><h2 id="ai-settings-title">{id ? 'Koneksi AI' : 'AI connection'}</h2><p className="muted noMargin">{id ? 'Atur provider, model, base URL, dan API key langsung di sini.' : 'Set provider, model, base URL, and API key directly here.'}</p></div>
      <KeyRound size={21} aria-hidden="true" />
    </div>
<div className={`aiConnectionStatus ${connectionState}`} role="status"><span className="aiStatusDot" aria-hidden="true" />{connectionState === "connected" ? (id ? `Terhubung · ${providerName}` : `Connected · ${providerName}`) : connectionState === "error" ? (id ? "Koneksi gagal" : "Connection failed") : (id ? "Belum terhubung" : "Not connected")}</div>
    <form className="aiDirectForm" onSubmit={handleSave}>
      <div className="settingsField">
        <span>Provider</span>
        <div className="providerPicker">
          {providerEntries.map(([providerId, item]) => <button type="button" key={providerId} aria-pressed={provider === providerId} className={`providerCard ${provider === providerId ? 'selected' : ''}`} onClick={() => changeProvider(providerId)}><strong>{item.label}</strong><small>{providerId === 'openai' ? (id ? 'Default OpenAI' : 'OpenAI default') : providerId === 'anthropic' ? 'Claude' : 'OpenAI-compatible'}</small></button>)}
        </div>
      </div>
      <div className="aiDirectGrid">
        <label className="settingsField" htmlFor="ai-base-url"><span>API base URL</span><input id="ai-base-url" className="input" type="url" value={baseUrl} readOnly={provider !== '9router' && provider !== 'custom'} onChange={(event) => { setBaseUrl(event.target.value); setKey(''); }} placeholder="https://api.example.com/v1" maxLength={500} required /></label>
        <label className="settingsField" htmlFor="ai-model"><span>Model ID</span><input id="ai-model" className="input" list="ai-model-options" value={model} onChange={(event) => setModel(event.target.value)} placeholder={id ? 'Model ID dari provider' : 'Model ID from provider'} maxLength={120} required /><datalist id="ai-model-options">{models.map((item) => <option key={item} value={item} />)}</datalist></label>
        <label className="settingsField aiKeyField" htmlFor="ai-api-key"><span>API key</span><input id="ai-api-key" className="input" type="password" autoComplete="new-password" value={key} onChange={(event) => setKey(event.target.value)} placeholder={hasKey ? (id ? 'Tersimpan, isi untuk mengganti' : 'Saved, enter to replace') : 'sk-…'} maxLength={512} /></label>
      </div>
      {models.length > 0 && <div className="modelsList" aria-label={id ? 'Model tersedia' : 'Available models'}>{models.slice(0, 10).map(m => <button type="button" key={m} className="modelTag" onClick={() => setModel(m)}>{m}</button>)}</div>}
      <div className="aiWizardActions">
        <button type="button" className="btn ghost" disabled={!ready || isChecking} onClick={() => void checkConnection()}>{isChecking ? (id ? 'Mengecek…' : 'Checking…') : (id ? 'Tes koneksi' : 'Test connection')}</button>
        <button className="btn" disabled={!ready || isSaving}>{isSaving ? (id ? 'Menyimpan…' : 'Saving…') : (id ? 'Simpan koneksi' : 'Save connection')}</button>
        {hasKey && <button type="button" className="btn ghost" onClick={() => { clearKey(); setKey(''); setNotice(id ? 'API key dihapus.' : 'API key removed.'); }}>{id ? 'Hapus key' : 'Clear key'}</button>}
      </div>
      {notice && <p className="aiWizardNotice" role="status" aria-live="polite">{notice}</p>}
    </form>
    <p className="aiSecurityNote"><ShieldCheck size={16} aria-hidden="true" />{id ? 'Key dienkripsi di desktop, hanya di memori browser, diteruskan melalui server ke provider; tidak disimpan di database aplikasi.' : 'Keys are encrypted on desktop, memory-only in browsers, relayed through the server to your provider, and not stored in the app database.'}</p>
  </section>;
}
