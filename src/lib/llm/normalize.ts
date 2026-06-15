import type { FormSchema } from '../schema/types';
import { compileJsonSchema } from '../schema/compile-json-schema';
import { compileZodSchema } from '../schema/compile-zod';
import { coercePhoneFields } from '../schema/coerce';
import { buildNormalizeSystemPrompt, buildRepairPrompt } from './prompt';
import type { LlmProvider } from './types';

export interface NormalizeArgs {
  schema: FormSchema;
  text: string;
  provider: LlmProvider;
  locale?: string;
  /** Max re-prompts after a validation failure (default 2). */
  maxRepairs?: number;
  signal?: AbortSignal;
}

export interface NormalizeIssue {
  field: string;
  message: string;
}

export interface NormalizeResult {
  /** Best-effort structured data — present even when invalid, for the human to confirm/fix. */
  data: Record<string, unknown>;
  valid: boolean;
  issues: NormalizeIssue[];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

/**
 * Turn a messy note into a validated lead record. Returns a partial draft with
 * flagged issues rather than throwing, because a human confirms before saving —
 * the LLM is an accelerator, not the authority.
 */
export async function normalizeLead(args: NormalizeArgs): Promise<NormalizeResult> {
  const { schema, text, provider, locale = 'en', maxRepairs = 2, signal } = args;
  const jsonSchema = compileJsonSchema(schema, locale) as unknown as Record<string, unknown>;
  const systemPrompt = buildNormalizeSystemPrompt(schema, locale);
  const validator = compileZodSchema(schema);

  let userText = text;
  let data: Record<string, unknown> = {};
  let issues: NormalizeIssue[] = [];

  for (let attempt = 0; attempt <= maxRepairs; attempt++) {
    const result = await provider.generateStructured({
      systemPrompt,
      userText,
      jsonSchema,
      signal,
    });

    data = coercePhoneFields(schema, asObject(result.raw));

    const parsed = validator.safeParse(data);
    if (parsed.success) {
      return { data: parsed.data as Record<string, unknown>, valid: true, issues: [] };
    }

    issues = parsed.error.issues.map((i) => ({
      field: i.path.join('.') || '(root)',
      message: i.message,
    }));

    if (attempt < maxRepairs) {
      userText = [
        text,
        '',
        'Previous attempt:',
        JSON.stringify(data),
        '',
        buildRepairPrompt(issues),
      ].join('\n');
    }
  }

  // Exhausted repairs — hand back the best-effort draft with flagged fields.
  return { data, valid: false, issues };
}
