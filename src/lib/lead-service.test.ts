import { describe, it, expect, beforeEach } from 'vitest';
import { saveLead } from './lead-service';
import { InMemoryStorageProvider } from './storage/in-memory-adapter';
import { defaultLeadSchema } from './schema/default-lead-schema';

describe('saveLead', () => {
  let storage: InMemoryStorageProvider;
  beforeEach(() => {
    storage = new InMemoryStorageProvider();
  });

  it('validates, normalizes the phone, and saves a valid lead', async () => {
    const result = await saveLead({
      storage,
      schema: defaultLeadSchema,
      data: { name: 'Ramesh', phone: '9876543210', interests: ['sarees'] },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lead.phone).toBe('+919876543210');
      expect(result.lead.source).toBe('manual');
    }
  });

  it('rejects a lead missing a required field with field-level issues', async () => {
    const result = await saveLead({
      storage,
      schema: defaultLeadSchema,
      data: { phone: '9876543210', interests: ['sarees'] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('validation_failed');
      expect(result.issues?.some((i) => i.field === 'name')).toBe(true);
    }
  });

  it('rejects an invalid select value', async () => {
    const result = await saveLead({
      storage,
      schema: defaultLeadSchema,
      data: { name: 'Ramesh', phone: '9876543210', interests: ['shoes'] },
    });
    expect(result.ok).toBe(false);
  });
});
