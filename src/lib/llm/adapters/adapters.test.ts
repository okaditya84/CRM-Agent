import { describe, it, expect } from 'vitest';
import { OpenAICompatibleProvider } from './openai-compatible';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { parseJsonContent, stripSchemaKeys } from './shared';
import type { GenerateStructuredArgs } from '../types';

interface Captured {
  url: string;
  init: RequestInit;
}

function fakeFetch(responder: (url: string) => { status: number; body: unknown }) {
  const calls: Captured[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    const { status, body } = responder(url);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

const ARGS: GenerateStructuredArgs = {
  systemPrompt: 'extract',
  userText: 'Ramesh, sarees',
  jsonSchema: {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
    additionalProperties: false,
  },
};

function bodyOf(c: Captured): Record<string, unknown> {
  return JSON.parse(c.init.body as string) as Record<string, unknown>;
}

describe('shared helpers', () => {
  it('parseJsonContent handles objects, plain JSON, and code fences', () => {
    expect(parseJsonContent({ a: 1 })).toEqual({ a: 1 });
    expect(parseJsonContent('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonContent('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('stripSchemaKeys removes a key recursively', () => {
    const stripped = stripSchemaKeys(
      { type: 'object', additionalProperties: false, properties: { x: { type: 'string' } } },
      ['additionalProperties'],
    ) as Record<string, unknown>;
    expect(stripped.additionalProperties).toBeUndefined();
    expect(stripped.properties).toBeDefined();
  });
});

describe('OpenAICompatibleProvider', () => {
  it('posts a json_schema response_format with bearer auth', async () => {
    const { fn, calls } = fakeFetch(() => ({
      status: 200,
      body: { choices: [{ message: { content: '{"name":"Ramesh"}' } }] },
    }));
    const provider = new OpenAICompatibleProvider({
      provider: 'openai_compatible',
      apiKey: 'sk-x',
      model: 'gpt-x',
      fetchImpl: fn,
    });
    const result = await provider.generateStructured(ARGS);
    expect(result.raw).toEqual({ name: 'Ramesh' });
    expect(calls[0]?.url).toBe('https://api.openai.com/v1/chat/completions');
    expect((calls[0]?.init.headers as Record<string, string>).Authorization).toBe('Bearer sk-x');
    const body = bodyOf(calls[0]!);
    expect((body.response_format as { type: string }).type).toBe('json_schema');
  });
});

describe('AnthropicProvider', () => {
  it('uses output_config.format and never sends temperature', async () => {
    const { fn, calls } = fakeFetch(() => ({
      status: 200,
      body: { content: [{ type: 'text', text: '{"name":"Ramesh"}' }] },
    }));
    const provider = new AnthropicProvider({
      provider: 'anthropic',
      apiKey: 'key',
      model: 'claude-haiku-4-5',
      temperature: 0.7,
      thinking: true,
      fetchImpl: fn,
    });
    const result = await provider.generateStructured(ARGS);
    expect(result.raw).toEqual({ name: 'Ramesh' });
    expect(calls[0]?.url).toBe('https://api.anthropic.com/v1/messages');
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('key');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    const body = bodyOf(calls[0]!);
    expect((body.output_config as { format: { type: string } }).format.type).toBe('json_schema');
    expect(body.temperature).toBeUndefined();
    expect((body.thinking as { type: string }).type).toBe('adaptive');
  });
});

describe('GeminiProvider', () => {
  it('strips additionalProperties and posts a responseSchema', async () => {
    const { fn, calls } = fakeFetch(() => ({
      status: 200,
      body: { candidates: [{ content: { parts: [{ text: '{"name":"Ramesh"}' }] } }] },
    }));
    const provider = new GeminiProvider({
      provider: 'gemini',
      apiKey: 'gkey',
      model: 'gemini-2.5-flash',
      fetchImpl: fn,
    });
    const result = await provider.generateStructured(ARGS);
    expect(result.raw).toEqual({ name: 'Ramesh' });
    expect(calls[0]?.url).toContain(':generateContent?key=gkey');
    const body = bodyOf(calls[0]!);
    const gen = body.generationConfig as { responseSchema: Record<string, unknown> };
    expect(gen.responseSchema.additionalProperties).toBeUndefined();
    expect(gen.responseSchema.properties).toBeDefined();
  });
});
