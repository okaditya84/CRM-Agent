import type {
  GenerateStructuredArgs,
  GenerateStructuredResult,
  LlmConfig,
  LlmProvider,
} from '../types';
import { parseJsonContent, readError } from './shared';

/** Works with OpenAI and any OpenAI-compatible endpoint (Groq, OpenRouter, Together, local). */
export class OpenAICompatibleProvider implements LlmProvider {
  readonly kind = 'openai_compatible' as const;

  constructor(private readonly config: LlmConfig) {}

  async generateStructured(args: GenerateStructuredArgs): Promise<GenerateStructuredResult> {
    const fetchImpl = this.config.fetchImpl ?? fetch;
    const base = (this.config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: [
        { role: 'system', content: args.systemPrompt },
        { role: 'user', content: args.userText },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'lead', schema: args.jsonSchema, strict: true },
      },
    };
    if (this.config.temperature !== undefined) body.temperature = this.config.temperature;

    const res = await fetchImpl(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: args.signal,
    });
    if (!res.ok) await readError(res, 'openai');

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    return { raw: parseJsonContent(json.choices?.[0]?.message?.content) };
  }
}
