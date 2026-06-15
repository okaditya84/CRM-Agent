import { z } from 'zod';
import type { FieldDef, FormSchema } from './types';

/** E.164 international phone format (e.g. +919812345678). Inputs are normalized before validation. */
export const E164_REGEX = /^\+[1-9]\d{7,14}$/;

function enumValues(field: FieldDef): [string, ...string[]] | null {
  const values = (field.options ?? []).map((o) => o.value);
  if (values.length === 0) return null;
  return values as [string, ...string[]];
}

/** Wrap an optional string-like validator so '' and undefined both pass. */
function optionalString(base: z.ZodType): z.ZodType {
  return z.union([base, z.literal('')]).optional();
}

function buildFieldValidator(field: FieldDef): z.ZodType {
  const v = field.validation ?? {};
  const required = field.required ?? false;

  switch (field.type) {
    case 'number': {
      let s = z.number();
      if (v.min !== undefined) s = s.min(v.min);
      if (v.max !== undefined) s = s.max(v.max);
      return required ? s : s.optional();
    }

    case 'single_select': {
      const values = enumValues(field);
      const base = values ? z.enum(values) : z.string();
      return required ? base : optionalString(base);
    }

    case 'multi_select': {
      const values = enumValues(field);
      const item = values ? z.enum(values) : z.string();
      let s = z.array(item);
      if (v.multiMax !== undefined) s = s.max(v.multiMax);
      if (required) s = s.min(1);
      return required ? s : s.optional();
    }

    case 'phone': {
      const base = z.string().regex(E164_REGEX, 'invalid_phone');
      return required ? base : optionalString(base);
    }

    case 'email': {
      const base = z.email('invalid_email');
      return required ? base : optionalString(base);
    }

    case 'text':
    case 'free_text':
    default: {
      let s = z.string();
      const minLen = v.minLen ?? (required ? 1 : undefined);
      if (minLen !== undefined) s = s.min(minLen);
      if (v.maxLen !== undefined) s = s.max(v.maxLen);
      if (v.pattern) s = s.regex(new RegExp(v.pattern));
      return required ? s : optionalString(s);
    }
  }
}

/** Compile the field schema into a Zod object that validates a lead's `data`. */
export function compileZodSchema(schema: FormSchema) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of schema.fields) {
    shape[field.key] = buildFieldValidator(field);
  }
  return z.object(shape);
}
