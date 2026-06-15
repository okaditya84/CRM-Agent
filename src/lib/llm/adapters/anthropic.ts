import type {
  GenerateStructuredArgs,
  GenerateStructuredResult,
  LlmConfig,
  LlmProvider,
} from '../types';
import { parseJsonContent, readError } from './shared';

/**
 * Anthropic Messages API with structured output via `output_config.format`.
 * Claude 4.x uses adaptive thinking and rejects temperature/budget_tokens, so we
 * never send those — depth is configured by the (optional) thinking flag only.
 */
export class AnthropicProvider implements LlmProvider {
  readonly kind = 'anthropic' as const;

  constructor(private readonly config: LlmConfig) {}

  async generateStructured(args: GenerateStructuredArgs): Promise<GenerateStructuredResult> {
    const fetchImpl = this.config.fetchImpl ?? fetch;
    const base = (this.config.baseUrl ?? 'https://api.anthropic.com').replace(/\/$/, '');
    const body: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: this.config.maxOutputTokens ?? 4096,
      system: args.systemPrompt,
      messages: [{ role: 'user', content: args.userText }],
      output_config: { format: { type: 'json_schema', schema: args.jsonSchema } },
    };
    if (this.config.thinking) body.thinking = { type: 'adaptive' };

    const res = await fetchImpl(`${base}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: args.signal,
    });
    if (!res.ok) await readError(res, 'anthropic');

    const json = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const textBlock = json.content?.find((b) => b.type === 'text');
    return { raw: parseJsonContent(textBlock?.text) };
  }
}
