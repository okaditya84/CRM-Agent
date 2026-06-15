import type { FormSchema } from '../../schema/types';
import type { Lead, LeadData, LeadSource } from '../types';

/**
 * How a single spreadsheet column is (de)serialized. Sheets store strings, so we
 * encode richer types deterministically:
 *   array → "a|b|c",  number → "12",  boolean → "true",  json → JSON.stringify.
 */
export type ColumnKind = 'string' | 'number' | 'boolean' | 'array' | 'json';

export interface ColumnSpec {
  key: string;
  kind: ColumnKind;
}

export function serializeCell(value: unknown, kind: ColumnKind): string {
  if (value === null || value === undefined) return '';
  switch (kind) {
    case 'array':
      return Array.isArray(value) ? value.map(String).join('|') : '';
    case 'json':
      return JSON.stringify(value);
    case 'number':
    case 'boolean':
    case 'string':
    default:
      return String(value);
  }
}

export function deserializeCell(raw: string, kind: ColumnKind): unknown {
  switch (kind) {
    case 'array':
      return raw ? raw.split('|').filter((s) => s.length > 0) : [];
    case 'number':
      return raw === '' ? undefined : Number(raw);
    case 'boolean':
      return raw === 'true';
    case 'json':
      return raw === '' ? undefined : JSON.parse(raw);
    case 'string':
    default:
      return raw;
  }
}

/** Map a flat record to a row in the order of `specs`. */
export function recordToRow(record: object, specs: ColumnSpec[]): string[] {
  const r = record as Record<string, unknown>;
  return specs.map((s) => serializeCell(r[s.key], s.kind));
}

/** Map a header→cell object back to a flat record using `specs`. */
export function rowToRecord(
  cells: Record<string, string>,
  specs: ColumnSpec[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const spec of specs) {
    if (spec.key in cells) out[spec.key] = deserializeCell(cells[spec.key] ?? '', spec.kind);
  }
  return out;
}

export const HEADER_KEYS = (specs: ColumnSpec[]): string[] => specs.map((s) => s.key);

/** Serialize a flat record into a key→cell map (order-independent). */
export function recordToCells(record: object, specs: ColumnSpec[]): Record<string, string> {
  const r = record as Record<string, unknown>;
  const cells: Record<string, string> = {};
  for (const s of specs) cells[s.key] = serializeCell(r[s.key], s.kind);
  return cells;
}

/** Zip a header row with a data row into a key→cell map. */
export function zipRow(header: string[], row: string[]): Record<string, string> {
  const cells: Record<string, string> = {};
  header.forEach((h, i) => {
    cells[h] = row[i] ?? '';
  });
  return cells;
}

// --- Lead columns are derived from the dynamic field schema -----------------

const META_LEADING: ColumnSpec[] = [{ key: 'id', kind: 'string' }];
const META_TRAILING: ColumnSpec[] = [
  { key: 'status', kind: 'string' },
  { key: 'source', kind: 'string' },
  { key: 'salespersonId', kind: 'string' },
  { key: 'createdAt', kind: 'string' },
  { key: 'updatedAt', kind: 'string' },
  { key: 'version', kind: 'number' },
];

function fieldKind(type: string): ColumnKind {
  if (type === 'multi_select') return 'array';
  if (type === 'number') return 'number';
  return 'string';
}

export function leadColumnSpecs(schema: FormSchema): ColumnSpec[] {
  return [
    ...META_LEADING,
    ...schema.fields.map((f) => ({ key: f.key, kind: fieldKind(f.type) })),
    ...META_TRAILING,
  ];
}

function leadToFlat(lead: Lead): Record<string, unknown> {
  return {
    ...lead.data,
    id: lead.id,
    status: lead.status,
    source: lead.source,
    salespersonId: lead.salespersonId ?? '',
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    version: lead.version,
  };
}

export function leadToRow(lead: Lead, specs: ColumnSpec[]): string[] {
  return recordToRow(leadToFlat(lead), specs);
}

export function leadToCells(lead: Lead, specs: ColumnSpec[]): Record<string, string> {
  return recordToCells(leadToFlat(lead), specs);
}

export function rowToLead(
  cells: Record<string, string>,
  schema: FormSchema,
  specs: ColumnSpec[],
): Lead {
  const flat = rowToRecord(cells, specs);
  const data: LeadData = {};
  for (const f of schema.fields) {
    if (f.key in flat) data[f.key] = flat[f.key];
  }
  const phone = typeof data.phone === 'string' ? data.phone : String(cells.phone ?? '');
  return {
    id: String(flat.id ?? ''),
    phone,
    data,
    status: String(flat.status ?? 'new') || 'new',
    source: (String(flat.source ?? 'manual') || 'manual') as LeadSource,
    salespersonId: flat.salespersonId ? String(flat.salespersonId) : null,
    createdAt: String(flat.createdAt ?? ''),
    updatedAt: String(flat.updatedAt ?? ''),
    version: typeof flat.version === 'number' ? flat.version : 1,
  };
}
