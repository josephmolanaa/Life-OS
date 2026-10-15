import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP } from 'node:net';
import { StringDecoder } from 'node:string_decoder';
import { isAiProvider, type AiConfig } from './ai-config';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type ReviewScope = 'finance' | 'habits' | 'career' | 'physique' | 'social';
export type AiRequest = { config: AiConfig; apiKey: string; messages: ChatMessage[]; reviewProgress: { days: 7 | 30; scopes: ReviewScope[] } | null };
export type AiConnection = { config: AiConfig; apiKey: string };

const reviewScopes = new Set<ReviewScope>(['finance', 'habits', 'career', 'physique', 'social']);

const reserved = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 3],
] as const) reserved.addSubnet(address, prefix, 'ipv4');

export function validateAiRequest(value: unknown): AiRequest {
  if (!value || typeof value !== 'object') throw new Error('Invalid request');
  const body = value as Record<string, unknown>;
  const config = body.config as Record<string, unknown> | null;
  if (!config || !isAiProvider(config.provider) || typeof config.model !== 'string' || !config.model.trim() || config.model.length > 120 || typeof config.baseUrl !== 'string' || config.baseUrl.length > 500) throw new Error('Invalid AI configuration');
  if (typeof body.apiKey !== 'string' || !body.apiKey.trim() || body.apiKey.length > 512 || /[\r\n]/.test(body.apiKey)) throw new Error('Invalid API key');
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 20 || body.messages.some((item) => !item || typeof item !== 'object' || (item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string' || !item.content.trim() || item.content.length > 8000) || body.messages.reduce((total: number, item: ChatMessage) => total + item.content.length, 0) > 20000 || body.messages.at(-1).role !== 'user') throw new Error('Invalid messages');
  let reviewProgress: AiRequest['reviewProgress'] = null;
  if (body.reviewProgress !== undefined && body.reviewProgress !== false) {
    if (!body.reviewProgress || typeof body.reviewProgress !== 'object') throw new Error('Invalid review option');
    const review = body.reviewProgress as Record<string, unknown>;
    if ((review.days !== 7 && review.days !== 30) || !Array.isArray(review.scopes) || !review.scopes.length || review.scopes.length > reviewScopes.size || review.scopes.some((scope) => !reviewScopes.has(scope))) throw new Error('Invalid review option');
    reviewProgress = { days: review.days, scopes: [...new Set(review.scopes as ReviewScope[])] };
  }
  return { config: { provider: config.provider, model: config.model.trim(), baseUrl: config.baseUrl.trim() }, apiKey: body.apiKey.trim(), messages: body.messages.map(({ role, content }) => ({ role, content })), reviewProgress };
}

export function validateAiConnection(value: unknown): AiConnection {
  if (!value || typeof value !== 'object') throw new Error('Invalid request');
  const body = value as Record<string, unknown>;
  const config = body.config as Record<string, unknown> | null;
  if (!config || !isAiProvider(config.provider) || typeof config.model !== 'string' || config.model.length > 120 || typeof config.baseUrl !== 'string' || config.baseUrl.length > 500) throw new Error('Invalid AI configuration');
  if (typeof body.apiKey !== 'string' || !body.apiKey.trim() || body.apiKey.length > 512 || /[\r\n]/.test(body.apiKey)) throw new Error('Invalid API key');
  return { config: { provider: config.provider, model: config.model.trim(), baseUrl: config.baseUrl.trim() }, apiKey: body.apiKey.trim() };
}

export function validateAiEndpoint(config: AiConfig, allowLocal: boolean) {
  let url: URL;
  try { url = new URL(config.baseUrl); } catch { throw new Error('Invalid API base URL'); }
  if (url.username || url.password || url.search || url.hash || !url.hostname) throw new Error('Invalid API base URL');
  const trusted = { openai: 'api.openai.com', anthropic: 'api.anthropic.com', openrouter: 'openrouter.ai' } as Record<string, string>;
  if (trusted[config.provider] && (url.protocol !== 'https:' || url.hostname !== trusted[config.provider] || url.port)) throw new Error('Use the provider default URL or select Custom');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname.toLowerCase());
  if (url.protocol !== 'https:' && !(allowLocal && local && url.protocol === 'http:')) throw new Error('Use HTTPS, or a local URL in the desktop app');
  if (local && !allowLocal) throw new Error('Local AI endpoints require the desktop app');
  if (!local && (isIP(url.hostname) !== 0 || url.hostname.endsWith('.local') || !url.hostname.includes('.'))) throw new Error('Invalid public API host');
  url.pathname = url.pathname.replace(/\/$/, '') + (config.provider === 'anthropic' ? '/messages' : '/chat/completions');
  return { url, local };
}

function validateModelsEndpoint(config: AiConfig, allowLocal: boolean) {
  const { url, local } = validateAiEndpoint({ ...config, model: config.model || 'model' }, allowLocal);
  url.pathname = url.pathname.replace(/\/(chat\/completions|messages)$/, '/models');
  return { url, local };
}

async function resolveEndpoint(url: URL, local: boolean) {
  if (local) return { address: url.hostname === '[::1]' ? '::1' : '127.0.0.1', family: url.hostname === '[::1]' ? 6 : 4 };
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address, family }) => family === 4 ? reserved.check(address, 'ipv4') : family !== 6 || !address.toLowerCase().startsWith('2') || address.toLowerCase().startsWith('2001:db8:'))) throw new Error('API host resolves to a private or reserved network');
  return addresses[0];
}

export function parseAiResponse(raw: string, anthropic: boolean) {
  const chunks: string[] = [];
  const payloads = raw.trimStart().startsWith('data:')
    ? raw.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).filter((line) => line && line !== '[DONE]')
    : [raw];

  for (const payload of payloads) {
    const data = JSON.parse(payload) as {
      choices?: Array<{ delta?: { content?: unknown }; message?: { content?: unknown } }>;
      content?: Array<{ type?: string; text?: string }>;
      delta?: { text?: string };
      type?: string;
      output_text?: unknown;
    };
    const content = anthropic
      ? data.content?.filter((block) => block.type === 'text').map((block) => block.text ?? '').join('\n') || data.delta?.text
      : data.choices?.[0]?.delta?.content || data.choices?.[0]?.message?.content || data.output_text;
    if (typeof content === 'string') chunks.push(content);
  }

  return chunks.join('');
}

function providerError(status: number, raw: string, apiKey: string) {
  let detail = '';
  try {
    const data = JSON.parse(raw) as { error?: { message?: unknown } | string; message?: unknown };
    const message = typeof data.error === 'string' ? data.error : data.error?.message ?? data.message;
    if (typeof message === 'string') detail = message.split(apiKey).join('[redacted]').split(encodeURIComponent(apiKey)).join('[redacted]').replace(/Bearer\s+\S+|(?:sk|key)-[\w-]+/gi, '[redacted]').replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 240);
  } catch {}
  return `Provider returned HTTP ${status}${detail ? `: ${detail}` : '. Check your API key, model, and URL.'}`;
}

export async function streamAiRequest(input: AiRequest, systemPrompt: string, allowLocal: boolean, onDelta: (delta: string) => void, signal?: AbortSignal) {
  const { url, local } = validateAiEndpoint(input.config, allowLocal);
  const { address } = await resolveEndpoint(url, local);
  const anthropic = input.config.provider === 'anthropic';
  const headers = anthropic
    ? { 'x-api-key': input.apiKey, 'anthropic-version': '2023-06-01' }
    : { Authorization: `Bearer ${input.apiKey}` };
  const body = JSON.stringify(anthropic
    ? { model: input.config.model, max_tokens: 1024, stream: true, system: systemPrompt, messages: input.messages }
    : {
        model: input.config.model,
        ...(input.config.provider === 'openai' ? { max_completion_tokens: 1024 } : { max_tokens: 1024 }), stream: true,
        messages: [{ role: 'system', content: systemPrompt }, ...input.messages],
      });

  const response = await new Promise<{ status: number; text: string }>((resolve, reject) => {
    const request = (local && url.protocol === 'http:' ? httpRequest : httpsRequest)({
      hostname: address, port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`, method: 'POST', servername: url.hostname,
      headers: { ...headers, Host: url.host, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      signal,
    }, (upstream) => {
      const chunks: Buffer[] = [];
      let size = 0;
      let pending = '';
      let streamed = false;
      const decoder = new StringDecoder('utf8');
      upstream.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > 1_000_000) { request.destroy(new Error('AI response too large')); return; }
        chunks.push(chunk);
        pending += decoder.write(chunk);
        const events = pending.split(/\r?\n\r?\n/);
        pending = events.pop() ?? '';
        for (const event of events) {
          const payload = event.split(/\r?\n/).map((line) => line.trim()).find((line) => line.startsWith('data:'))?.slice(5).trim();
          if (!payload || payload === '[DONE]' || (upstream.statusCode ?? 502) >= 300) continue;
          try {
            const eventData = JSON.parse(payload);
            if (eventData.error || eventData.type === 'error') throw new Error(providerError(502, payload, input.apiKey));
            const delta = parseAiResponse(payload, anthropic);
            if (delta) { streamed = true; onDelta(delta); }
          } catch (error) { request.destroy(error instanceof Error ? error : new Error('Invalid provider response')); return; }
        }
      });
      upstream.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        pending += decoder.end();
        if (streamed && pending.trim()) {
          const payload = pending.split(/\r?\n/).find((line) => line.startsWith('data:'))?.slice(5).trim();
          if (payload && payload !== '[DONE]') {
            try { onDelta(parseAiResponse(payload, anthropic)); } catch (error) { reject(error); return; }
          }
        }
        if (!streamed && (upstream.statusCode ?? 502) >= 200 && (upstream.statusCode ?? 502) < 300) {
          try { const content = parseAiResponse(text, anthropic); if (content) onDelta(content); } catch {}
        }
        resolve({ status: upstream.statusCode ?? 502, text });
      });
      upstream.on('error', reject);
    });
    request.setTimeout(30_000, () => request.destroy(new Error('AI request timed out')));
    request.on('error', reject);
    request.end(body);
  });

  if (response.status < 200 || response.status >= 300) throw new Error(providerError(response.status, response.text, input.apiKey));
  try { parseAiResponse(response.text, anthropic); } catch { if (!response.text.trimStart().startsWith('data:')) throw new Error('Invalid provider response'); }
}

export async function sendAiRequest(input: AiRequest, systemPrompt: string, allowLocal: boolean, signal?: AbortSignal) {
  let content = '';
  await streamAiRequest(input, systemPrompt, allowLocal, (delta) => { content = (content + delta).slice(0, 8000); }, signal);
  if (!content) throw new Error('Provider returned an empty message');
  return { role: 'assistant' as const, content };
}

export async function discoverAiModels(input: AiConnection, allowLocal: boolean, signal?: AbortSignal) {
  const { url, local } = validateModelsEndpoint(input.config, allowLocal);
  const { address } = await resolveEndpoint(url, local);
  const headers = input.config.provider === 'anthropic'
    ? { 'x-api-key': input.apiKey, 'anthropic-version': '2023-06-01' }
    : { Authorization: `Bearer ${input.apiKey}` };
  const started = Date.now();
  const response = await new Promise<{ status: number; text: string }>((resolve, reject) => {
    const request = (local && url.protocol === 'http:' ? httpRequest : httpsRequest)({
      hostname: address, port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80), path: `${url.pathname}${url.search}`,
      method: 'GET', servername: url.hostname, headers: { ...headers, Host: url.host }, signal,
    }, (upstream) => {
      const chunks: Buffer[] = [];
      let size = 0;
      upstream.on('data', (chunk: Buffer) => { size += chunk.length; if (size > 1_000_000) request.destroy(new Error('AI response too large')); else chunks.push(chunk); });
      upstream.on('end', () => resolve({ status: upstream.statusCode ?? 502, text: Buffer.concat(chunks).toString('utf8') }));
      upstream.on('error', reject);
    });
    request.setTimeout(15_000, () => request.destroy(new Error('AI request timed out')));
    request.on('error', reject);
    request.end();
  });
  if (response.status < 200 || response.status >= 300) throw new Error(providerError(response.status, response.text, input.apiKey));
  let data: { data?: Array<{ id?: unknown }> };
  try { data = JSON.parse(response.text); } catch { throw new Error('Invalid provider response'); }
  if (!Array.isArray(data?.data)) throw new Error('Invalid provider response');
  return { models: [...new Set(data.data.map((model) => model?.id).filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 120))].slice(0, 200), latencyMs: Date.now() - started };
}
