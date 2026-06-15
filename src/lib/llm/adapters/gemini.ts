import type {
  GenerateStructuredArgs,
  GenerateStructuredResult,
  LlmConfig,
  LlmProvider,
} from '../types';
import { parseJsonContent, readError, stripSchemaKeys } from './shared';

/**
 * Google Gemini generateContent with a response schema. Gemini rejects
 * `additionalProperties`, so we strip it before sending.
 */
export class GeminiProvider implements LlmProvider {
  readonly kind = 'gemini' as const;

  constructor(private readonly config: LlmConfig) {}

  async generateStructured(args: GenerateStructuredArgs): Promise<GenerateStructuredResult> {
    const fetchImpl = this.config.fetchImpl ?? fetch;
    const base = (
      this.config.baseUrl ?? 'https://generativelanguage.googleapis.com'
    ).replace(/\/$/, '');
    const responseSchema = stripSchemaKeys(args.jsonSchema, ['additionalProperties']);
    const generationConfig: Record<string, unknown> = {
      responseMimeType: 'application/json',
      responseSchema,
    };
    if (this.config.temperature !== undefined) {
      generationConfig.temperature = this.config.temperature;
    }

    const url = `${base}/v1beta/models/${encodeURIComponent(this.config.model)}:generateContent?key=${encodeURIComponent(this.config.apiKey)}`;
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: args.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: args.userText }] }],
        generationConfig,
      }),
      signal: args.signal,
    });
    if (!res.ok) await readError(res, 'gemini');

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return { raw: parseJsonContent(json.candidates?.[0]?.content?.parts?.[0]?.text) };
  }
}
