import { describe, it, expect } from 'vitest';
import {
  serializeCell,
  deserializeCell,
  leadColumnSpecs,
  leadToCells,
  rowToLead,
  zipRow,
  recordToRow,
} from './column-spec';
import { defaultLeadSchema } from '../../schema/default-lead-schema';
import type { Lead } from '../types';

describe('cell (de)serialization', () => {
  it('round-trips each kind', () => {
    expect(deserializeCell(serializeCell(['a', 'b'], 'array'), 'array')).toEqual(['a', 'b']);
    expect(deserializeCell(serializeCell(42, 'number'), 'number')).toBe(42);
    expect(deserializeCell(serializeCell(true, 'boolean'), 'boolean')).toBe(true);
    expect(deserializeCell(serializeCell({ a: 1 }, 'json'), 'json')).toEqual({ a: 1 });
    expect(deserializeCell(serializeCell('hi', 'string'), 'string')).toBe('hi');
  });

  it('treats null/undefined as empty', () => {
    expect(serializeCell(null, 'string')).toBe('');
    expect(serializeCell(undefined, 'number')).toBe('');
    expect(deserializeCell('', 'array')).toEqual([]);
    expect(deserializeCell('', 'number')).toBeUndefined();
  });
});

describe('lead row mapping (header-driven)', () => {
  it('round-trips a lead through cells → header-zipped row → lead', () => {
    const specs = leadColumnSpecs(defaultLeadSchema);
    const header = specs.map((s) => s.key);
    const lead: Lead = {
      id: '01HXAMPLEULID0000000000000',
      phone: '+919876543210',
      data: {
        name: 'Ramesh',
        phone: '+919876543210',
        interests: ['sarees', 'embroidery'],
        city: 'Surat',
      },
      salespersonId: null,
      source: 'manual',
      status: 'new',
      createdAt: '2026-06-15T00:00:00.000Z',
      updatedAt: '2026-06-15T00:00:00.000Z',
      version: 3,
    };

    const cells = leadToCells(lead, specs);
    const row = header.map((h) => cells[h] ?? '');
    const back = rowToLead(zipRow(header, row), defaultLeadSchema, specs);

    expect(back.id).toBe(lead.id);
    expect(back.phone).toBe(lead.phone);
    expect(back.data.interests).toEqual(['sarees', 'embroidery']);
    expect(back.data.city).toBe('Surat');
    expect(back.salespersonId).toBeNull();
    expect(back.version).toBe(3);
    expect(back.status).toBe('new');
  });

  it('recordToRow follows spec order', () => {
    const row = recordToRow({ id: 'x', version: 2 }, [
      { key: 'id', kind: 'string' },
      { key: 'version', kind: 'number' },
    ]);
    expect(row).toEqual(['x', '2']);
  });
});
