import { LlmError } from '../types';

/** Parse model output into a JSON object, tolerating code fences and stray whitespace. */
export function parseJsonContent(content: unknown): unknown {
  if (content && typeof content === 'object') return content;
  if (typeof content !== 'string') throw new LlmError('llm_no_content');
  let s = content.trim();
  if (s.startsWith('```')) {
    s = s
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/, '')
      .trim();
  }
  try {
    return JSON.parse(s);
  } catch {
    throw new LlmError('llm_invalid_json');
  }
}

/** Recursively remove keys (e.g. unsupported `additionalProperties`) from a JSON Schema. */
export function stripSchemaKeys(
  schema: unknown,
  keys: readonly string[],
): unknown {
  if (Array.isArray(schema)) return schema.map((s) => stripSchemaKeys(s, keys));
  if (schema && typeof schema === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
      if (keys.includes(k)) continue;
      out[k] = stripSchemaKeys(v, keys);
    }
    return out;
  }
  return schema;
}

export async function readError(res: Response, prefix: string): Promise<never> {
  const text = await res.text().catch(() => '');
  throw new LlmError(`${prefix} ${res.status}: ${text.slice(0, 200)}`, res.status, res.status >= 500);
}
