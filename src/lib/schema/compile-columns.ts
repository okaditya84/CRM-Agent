import type { FormSchema } from './types';
import { resolveI18n } from './i18n';

/**
 * Fixed columns every entity row carries, alongside the schema-defined fields.
 * `id` leads; the bookkeeping columns trail so field columns stay grouped.
 */
export const LEADING_COLUMNS = ['id'] as const;
export const TRAILING_COLUMNS = ['createdAt', 'updatedAt', 'version'] as const;

export interface SheetColumn {
  /** Stable key written to the header row and used for read/write mapping. */
  key: string;
  /** Human-friendly label for display (e.g. settings preview); not used as the stored header. */
  label: string;
}

/**
 * Ordered column keys for the Sheet header row.
 * Headers are the stable `key`s (not localized labels) so switching UI language
 * never rewrites the spreadsheet. Order: id, <fields in schema order>, bookkeeping.
 */
export function compileColumnKeys(schema: FormSchema): string[] {
  return [
    ...LEADING_COLUMNS,
    ...schema.fields.map((f) => f.key),
    ...TRAILING_COLUMNS,
  ];
}

/** Ordered columns with localized display labels (for a settings/preview UI). */
export function compileColumns(schema: FormSchema, locale = 'en'): SheetColumn[] {
  return [
    ...LEADING_COLUMNS.map((key) => ({ key, label: key })),
    ...schema.fields.map((f) => ({ key: f.key, label: resolveI18n(f.label, locale) })),
    ...TRAILING_COLUMNS.map((key) => ({ key, label: key })),
  ];
}
