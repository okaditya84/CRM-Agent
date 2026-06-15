import { normalizePhone } from '../phone';
import type { FormSchema } from './types';

/**
 * Normalize phone-typed fields to E.164 before validation. The form and the LLM
 * both produce phones as written (e.g. "98765 43210"); validation expects E.164,
 * so coerce first. Invalid values are left as-is so validation flags them.
 */
export function coercePhoneFields(
  schema: FormSchema,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...data };
  for (const field of schema.fields) {
    if (field.type !== 'phone') continue;
    const value = out[field.key];
    if (typeof value === 'string' && value.trim()) {
      const normalized = normalizePhone(value);
      if (normalized) out[field.key] = normalized;
    }
  }
  return out;
}
