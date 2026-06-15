/**
 * Provider-agnostic LLM layer. The admin can point this at any OpenAI-compatible
 * endpoint, Anthropic, or Gemini — model, key, base URL, and thinking mode are all
 * configuration, never hardcoded.
 */

export type LlmProviderKind = 'openai_compatible' | 'anthropic' | 'gemini';

export interface LlmConfig {
  provider: LlmProviderKind;
  apiKey: string;
  model: string;
  /** Override the API host (e.g. an OpenAI-compatible gateway, Azure, a local server). */
  baseUrl?: string;
  /** Enable provider thinking/reasoning where supported. */
  thinking?: boolean;
  /** Only sent to providers/models that accept it (skipped for Claude 4.x). */
  temperature?: number;
  /** Cap output tokens (providers that require it, e.g. Anthropic). */
  maxOutputTokens?: number;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export interface GenerateStructuredArgs {
  systemPrompt: string;
  userText: string;
  /** JSON Schema the model output must conform to. */
  jsonSchema: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface GenerateStructuredResult {
  /** Parsed JSON object the model produced (unvalidated against business rules). */
  raw: unknown;
}

/** A single LLM call that returns structured JSON. */
export interface LlmProvider {
  readonly kind: LlmProviderKind;
  generateStructured(args: GenerateStructuredArgs): Promise<GenerateStructuredResult>;
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retriable = false,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}
