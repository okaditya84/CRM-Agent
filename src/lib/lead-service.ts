import type { FormSchema } from './schema/types';
import { compileZodSchema } from './schema/compile-zod';
import { coercePhoneFields } from './schema/coerce';
import type { Lead, LeadSource, StorageProvider } from './storage/types';

export interface SaveLeadInput {
  storage: StorageProvider;
  schema: FormSchema;
  data: Record<string, unknown>;
  source?: LeadSource;
  salespersonId?: string | null;
}

export type SaveLeadResult =
  | { ok: true; lead: Lead }
  | { ok: false; error: string; issues?: { field: string; message: string }[] };

/**
 * Validate a lead against the active schema, then upsert it (idempotent by phone).
 * Validation runs server-side too — the form can't be trusted as the only gate.
 */
export async function saveLead(input: SaveLeadInput): Promise<SaveLeadResult> {
  const validator = compileZodSchema(input.schema);
  const coerced = coercePhoneFields(input.schema, input.data);
  const parsed = validator.safeParse(coerced);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'validation_failed',
      issues: parsed.error.issues.map((i) => ({
        field: i.path.join('.') || '(root)',
        message: i.message,
      })),
    };
  }

  const data = parsed.data as Record<string, unknown>;
  const phone = typeof data.phone === 'string' ? data.phone : '';

  const result = await input.storage.upsertLeadByPhone({
    phone,
    data,
    source: input.source ?? 'manual',
    salespersonId: input.salespersonId ?? null,
  });

  if (result.ok) return { ok: true, lead: result.record };
  if (result.reason === 'version_conflict') {
    return { ok: false, error: 'version_conflict' };
  }
  if (result.reason === 'rate_limited') return { ok: false, error: 'rate_limited' };
  return { ok: false, error: result.error };
}
