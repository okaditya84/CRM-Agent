import type { ColumnSpec } from './column-spec';

/** Fixed column layouts for the non-lead worksheets. */

export const INTERACTION_SPECS: ColumnSpec[] = [
  { key: 'id', kind: 'string' },
  { key: 'leadId', kind: 'string' },
  { key: 'kind', kind: 'string' },
  { key: 'body', kind: 'string' },
  { key: 'authorId', kind: 'string' },
  { key: 'createdAt', kind: 'string' },
  { key: 'updatedAt', kind: 'string' },
  { key: 'version', kind: 'number' },
];

export const SALESPERSON_SPECS: ColumnSpec[] = [
  { key: 'id', kind: 'string' },
  { key: 'name', kind: 'string' },
  { key: 'phone', kind: 'string' },
  { key: 'active', kind: 'boolean' },
  { key: 'createdAt', kind: 'string' },
  { key: 'updatedAt', kind: 'string' },
  { key: 'version', kind: 'number' },
];

export const PHOTO_SPECS: ColumnSpec[] = [
  { key: 'id', kind: 'string' },
  { key: 'storageKey', kind: 'string' },
  { key: 'url', kind: 'string' },
  { key: 'mime', kind: 'string' },
  { key: 'caption', kind: 'string' },
  { key: 'sku', kind: 'string' },
  { key: 'price', kind: 'number' },
  { key: 'tags', kind: 'array' },
  { key: 'createdAt', kind: 'string' },
  { key: 'updatedAt', kind: 'string' },
  { key: 'version', kind: 'number' },
];

export const SETTING_SPECS: ColumnSpec[] = [
  { key: 'id', kind: 'string' },
  { key: 'key', kind: 'string' },
  { key: 'value', kind: 'json' },
  { key: 'scope', kind: 'string' },
  { key: 'createdAt', kind: 'string' },
  { key: 'updatedAt', kind: 'string' },
  { key: 'version', kind: 'number' },
];

export const SHEET_TITLES = {
  leads: 'Leads',
  interactions: 'Interactions',
  salespeople: 'Salespeople',
  photos: 'Photos',
  settings: 'Settings',
} as const;
