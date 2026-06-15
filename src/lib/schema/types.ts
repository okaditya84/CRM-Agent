/**
 * The field schema is the single source of truth for the whole app.
 * One `FormSchema` is compiled into:
 *   1. a Zod validator   (compile-zod.ts)        → drives & validates the form
 *   2. Sheet columns      (compile-columns.ts)    → maps fields to spreadsheet columns
 *   3. a JSON Schema      (compile-json-schema.ts) → the LLM's structured-output contract
 *
 * Because all three derive from the same `FieldDef[]`, the form, the spreadsheet,
 * and the LLM output can never drift apart. Adding a field or an option is a data
 * edit — no code change.
 */

export type FieldType =
  | 'text'
  | 'number'
  | 'phone'
  | 'email'
  | 'single_select'
  | 'multi_select'
  | 'free_text';

/** A localized string. `en` is required as the guaranteed fallback. */
export type I18nText = { en: string } & Record<string, string>;

/** One choice in a select field. `value` is the stable, language-independent stored value. */
export interface EnumOption {
  value: string;
  label: I18nText;
}

export interface FieldValidation {
  /** number: inclusive bounds */
  min?: number;
  max?: number;
  /** string/free_text: length bounds */
  minLen?: number;
  maxLen?: number;
  /** string: raw regex source (validated as-is) */
  pattern?: string;
  /** multi_select: maximum number of selections */
  multiMax?: number;
}

export interface FieldDef {
  /** Stable snake_case key — used as the object key, Sheet column, and JSON-schema property. */
  key: string;
  type: FieldType;
  label: I18nText;
  placeholder?: I18nText;
  help?: I18nText;
  required?: boolean;
  /** Required for single_select / multi_select. */
  options?: EnumOption[];
  validation?: FieldValidation;
  /** Guidance for the LLM normalizer. */
  llm?: {
    /** Whether the LLM should attempt to extract this field (default true). */
    extract?: boolean;
    hint?: I18nText;
  };
}

export interface FormSchema {
  /** Bump on any change — used as a cache key and to trigger Sheet header reconcile. */
  version: number;
  entity: string;
  fields: FieldDef[];
}
