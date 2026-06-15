import type { FieldDef, FormSchema } from '../schema/types';
import { resolveI18n } from '../schema/i18n';

function describeField(field: FieldDef, locale: string): string {
  const label = resolveI18n(field.label, locale);
  const parts: string[] = [`- "${field.key}" (${field.type}): ${label}`];
  if (field.required) parts.push('[required]');
  if (field.llm?.hint) parts.push(`Hint: ${resolveI18n(field.llm.hint, locale)}`);
  if (
    (field.type === 'single_select' || field.type === 'multi_select') &&
    field.options?.length
  ) {
    const opts = field.options
      .map((o) => `${o.value} = "${resolveI18n(o.label, locale)}"`)
      .join('; ');
    parts.push(`Allowed values (use the value on the left): ${opts}`);
  }
  return parts.join(' ');
}

/**
 * System prompt for turning a messy note (any language) into a structured lead.
 * The field catalog is rendered from the schema, so it always matches what the
 * form and the storage layer expect.
 */
export function buildNormalizeSystemPrompt(schema: FormSchema, locale = 'en'): string {
  const fields = schema.fields
    .filter((f) => f.llm?.extract !== false)
    .map((f) => describeField(f, locale))
    .join('\n');

  return [
    'You extract structured lead data for a textile (saree / dress-material / embroidery) wholesaler at a trade fair.',
    'The input is a free-form note that may be in English, Hindi, Gujarati, or a mix (including romanized text). Understand it regardless of language.',
    '',
    'Fields to extract:',
    fields,
    '',
    'Rules:',
    '- Output ONLY the JSON object matching the provided schema. No prose, no markdown.',
    '- For select fields, output the canonical value (left of "="), never the human label.',
    '- Map described interests to the closest allowed value(s); use "other" only when nothing fits.',
    '- Phone numbers: keep digits and any leading country code; do not invent digits.',
    '- Leave a field out (or empty) if the note does not contain it — never fabricate data.',
    '- Preserve free-text notes in the language they were written.',
  ].join('\n');
}

/** Compact instruction for a repair pass after validation failed. */
export function buildRepairPrompt(
  issues: { field: string; message: string }[],
): string {
  const lines = issues.map((i) => `- ${i.field}: ${i.message}`).join('\n');
  return [
    'The previous JSON had validation problems. Fix ONLY these fields and return the full corrected JSON object:',
    lines,
    'Keep all other fields exactly as before.',
  ].join('\n');
}
