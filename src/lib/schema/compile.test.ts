import { describe, it, expect } from 'vitest';
import { compileZodSchema } from './compile-zod';
import { compileColumnKeys } from './compile-columns';
import { compileJsonSchema } from './compile-json-schema';
import { defaultLeadSchema } from './default-lead-schema';

describe('compileZodSchema', () => {
  const validator = compileZodSchema(defaultLeadSchema);

  it('accepts a valid lead with only required fields', () => {
    const result = validator.safeParse({
      name: 'Ramesh Patel',
      phone: '+919812345678',
      interests: ['sarees'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional fields as empty strings', () => {
    const result = validator.safeParse({
      name: 'Ramesh',
      phone: '+919812345678',
      interests: ['sarees', 'embroidery'],
      email: '',
      company: '',
      city: '',
      buyer_type: '',
      notes: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing required field (name)', () => {
    const result = validator.safeParse({ phone: '+919812345678', interests: ['sarees'] });
    expect(result.success).toBe(false);
  });

  it('rejects a non-E.164 phone number', () => {
    const result = validator.safeParse({
      name: 'Ramesh',
      phone: '9812345678',
      interests: ['sarees'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown select value', () => {
    const result = validator.safeParse({
      name: 'Ramesh',
      phone: '+919812345678',
      interests: ['shoes'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty required multi-select', () => {
    const result = validator.safeParse({
      name: 'Ramesh',
      phone: '+919812345678',
      interests: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email when provided', () => {
    const result = validator.safeParse({
      name: 'Ramesh',
      phone: '+919812345678',
      interests: ['sarees'],
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('compileColumnKeys', () => {
  it('produces id, fields in order, then bookkeeping columns', () => {
    expect(compileColumnKeys(defaultLeadSchema)).toEqual([
      'id',
      'name',
      'phone',
      'email',
      'company',
      'city',
      'interests',
      'buyer_type',
      'notes',
      'createdAt',
      'updatedAt',
      'version',
    ]);
  });
});

describe('compileJsonSchema', () => {
  const json = compileJsonSchema(defaultLeadSchema);

  it('marks only the required fields as required', () => {
    expect(json.required).toEqual(['name', 'phone', 'interests']);
  });

  it('is strict (no additional properties)', () => {
    expect(json.additionalProperties).toBe(false);
  });

  it('encodes multi-select as an array with an enum of canonical values', () => {
    const interests = json.properties.interests;
    expect(interests?.type).toBe('array');
    expect((interests?.items as { enum: string[] }).enum).toContain('sarees');
  });

  it('encodes single-select as a string enum', () => {
    const buyerType = json.properties.buyer_type;
    expect(buyerType?.type).toBe('string');
    expect((buyerType?.enum as string[])).toContain('wholesaler');
  });

  it('includes allowed-value guidance in the description for selects', () => {
    expect(String(json.properties.interests?.description)).toContain('dress_materials');
  });
});
