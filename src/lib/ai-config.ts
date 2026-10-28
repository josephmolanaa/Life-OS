export type AiProviderId = 'openai' | 'anthropic' | 'openrouter' | '9router' | 'hermes' | 'custom';

export type AiConfig = { provider: AiProviderId; model: string; baseUrl: string };
export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export function trimAiMessages(messages: ChatMessage[]) {
  const selected: ChatMessage[] = [];
  let length = 0;
  for (const message of [...messages].reverse()) {
    if (selected.length >= 20 || length + message.content.length > 20000) break;
    selected.unshift(message);
    length += message.content.length;
  }
  while (selected[0]?.role === 'assistant') selected.shift();
  return selected;
}

export const aiProviders: Record<AiProviderId, { label: string; baseUrl: string }> = {
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  anthropic: { label: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com/v1' },
  openrouter: { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  hermes: { label: 'Hermes Agent', baseUrl: 'http://localhost:11434/v1' },
  '9router': { label: '9Router', baseUrl: '' },
  custom: { label: 'Custom (OpenAI-compatible)', baseUrl: '' },
};

export const defaultAiConfig: AiConfig = { provider: 'openai', model: '', baseUrl: aiProviders.openai.baseUrl };

export function isAiProvider(value: unknown): value is AiProviderId {
  return typeof value === 'string' && Object.hasOwn(aiProviders, value);
}
