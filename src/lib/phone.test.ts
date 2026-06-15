import { describe, it, expect } from 'vitest';
import { normalizePhone, isE164 } from './phone';

describe('normalizePhone', () => {
  it('keeps an international number and strips formatting', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('+919876543210');
    expect(normalizePhone('+1 (415) 555-2671')).toBe('+14155552671');
  });

  it('prepends the default country code (+91) to a bare national number', () => {
    expect(normalizePhone('9876543210')).toBe('+919876543210');
  });

  it('strips a local trunk 0 prefix', () => {
    expect(normalizePhone('09876543210')).toBe('+919876543210');
  });

  it('adds + to a number that already includes a country code', () => {
    expect(normalizePhone('919876543210')).toBe('+919876543210');
  });

  it('returns null for empty or clearly invalid input', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('   ')).toBeNull();
    expect(normalizePhone('abcd')).toBeNull();
    expect(normalizePhone('123')).toBeNull();
  });
});

describe('isE164', () => {
  it('recognizes valid and invalid E.164 strings', () => {
    expect(isE164('+919876543210')).toBe(true);
    expect(isE164('9876543210')).toBe(false);
    expect(isE164('+0123')).toBe(false);
  });
});
