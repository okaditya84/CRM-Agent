import type { FieldDef, FormSchema } from './types';
import { resolveI18n } from './i18n';

export interface JsonSchema {
  type: 'object';
  properties: Record<string, Record<string, unknown>>;
  required: string[];
  additionalProperties: false;
}

/**
 * Build a description that guides the LLM: the field label, any hint, and — for
 * selects — the allowed canonical values with their human labels so the model can
 * map free text (e.g. "embroidery work") to the stored value (e.g. "embroidery").
 */
function buildDescription(field: FieldDef, locale: string): string {
  const parts: string[] = [resolveI18n(field.label, locale)];
  if (field.llm?.hint) parts.push(resolveI18n(field.llm.hint, locale));
  if (
    (field.type === 'single_select' || field.type === 'multi_select') &&
    field.options?.length
  ) {
    const opts = field.options
      .map((o) => `${o.value} (${resolveI18n(o.label, locale)})`)
      .join(', ');
    parts.push(`Allowed values: ${opts}`);
  }
  return parts.filter(Boolean).join('. ');
}

function fieldToProperty(field: FieldDef, locale: string): Record<string, unknown> {
  const v = field.validation ?? {};
  const description = buildDescription(field, locale);
  const withDesc = (p: Record<string, unknown>) =>
    description ? { ...p, description } : p;

  switch (field.type) {
    case 'number': {
      const p: Record<string, unknown> = { type: 'number' };
      if (v.min !== undefined) p.minimum = v.min;
      if (v.max !== undefined) p.maximum = v.max;
      return withDesc(p);
    }
    case 'single_select':
      return withDesc({
        type: 'string',
        enum: (field.options ?? []).map((o) => o.value),
      });
    case 'multi_select':
      return withDesc({
        type: 'array',
        items: { type: 'string', enum: (field.options ?? []).map((o) => o.value) },
      });
    case 'email':
    case 'phone':
    case 'text':
    case 'free_text':
    default:
      return withDesc({ type: 'string' });
  }
}

/** Compile the field schema into a strict JSON Schema for LLM structured output. */
export function compileJsonSchema(schema: FormSchema, locale = 'en'): JsonSchema {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];
  for (const field of schema.fields) {
    if (field.llm?.extract === false) continue;
    properties[field.key] = fieldToProperty(field, locale);
    if (field.required) required.push(field.key);
  }
  return { type: 'object', properties, required, additionalProperties: false };
}
