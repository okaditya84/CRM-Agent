import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorageProvider } from './in-memory-adapter';
import type { WriteResult } from './types';

function expectOk<T>(result: WriteResult<T>): T {
  if (!result.ok) throw new Error(`expected ok, got "${result.reason}"`);
  return result.record;
}

describe('InMemoryStorageProvider — leads', () => {
  let store: InMemoryStorageProvider;
  beforeEach(() => {
    store = new InMemoryStorageProvider();
  });

  it('creates a new lead with version 1, default status, and normalized phone', async () => {
    const lead = expectOk(
      await store.upsertLeadByPhone({
        phone: '9876543210',
        data: { name: 'Ramesh' },
        source: 'manual',
      }),
    );
    expect(lead.version).toBe(1);
    expect(lead.status).toBe('new');
    expect(lead.phone).toBe('+919876543210');
    expect(lead.data.phone).toBe('+919876543210');
    expect(lead.id).toHaveLength(26); // ULID
  });

  it('upserting the same number (different format) updates, never duplicates', async () => {
    const first = expectOk(
      await store.upsertLeadByPhone({
        phone: '+919876543210',
        data: { name: 'Ramesh', city: 'Surat' },
        source: 'manual',
      }),
    );
    const second = expectOk(
      await store.upsertLeadByPhone({
        phone: '09876543210', // same number, local format
        data: { company: 'Patel Textiles' },
        source: 'whatsapp_bot',
      }),
    );

    expect(second.id).toBe(first.id);
    expect(second.version).toBe(2);
    // Merge preserves unrelated fields.
    expect(second.data.name).toBe('Ramesh');
    expect(second.data.city).toBe('Surat');
    expect(second.data.company).toBe('Patel Textiles');

    const page = await store.listLeads();
    expect(page.items).toHaveLength(1);
  });

  it('rejects an upsert whose expectedVersion is stale', async () => {
    await store.upsertLeadByPhone({
      phone: '9876543210',
      data: { name: 'Ramesh' },
      source: 'manual',
    });
    const conflict = await store.upsertLeadByPhone({
      phone: '9876543210',
      data: { name: 'Updated' },
      source: 'manual',
      expectedVersion: 99,
    });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.reason).toBe('version_conflict');
  });

  it('rejects an invalid phone number', async () => {
    const result = await store.upsertLeadByPhone({
      phone: 'not-a-number',
      data: {},
      source: 'manual',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('transport');
  });

  it('updateLead enforces optimistic concurrency', async () => {
    const lead = expectOk(
      await store.upsertLeadByPhone({
        phone: '9876543210',
        data: { name: 'Ramesh' },
        source: 'manual',
      }),
    );
    const updated = expectOk(
      await store.updateLead(lead.id, { status: 'contacted' }, lead.version),
    );
    expect(updated.status).toBe('contacted');
    expect(updated.version).toBe(2);

    // Reusing the old version must conflict.
    const stale = await store.updateLead(lead.id, { status: 'won' }, lead.version);
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.reason).toBe('version_conflict');
  });

  it('finds a lead by an unnormalized phone', async () => {
    await store.upsertLeadByPhone({
      phone: '+919876543210',
      data: { name: 'Ramesh' },
      source: 'manual',
    });
    const found = await store.findLeadByPhone('98765 43210');
    expect(found?.data.name).toBe('Ramesh');
  });
});

describe('InMemoryStorageProvider — interactions, settings, photos, salespeople', () => {
  let store: InMemoryStorageProvider;
  beforeEach(() => {
    store = new InMemoryStorageProvider();
  });

  it('appends and lists interactions for a lead', async () => {
    const lead = expectOk(
      await store.upsertLeadByPhone({ phone: '9876543210', data: {}, source: 'manual' }),
    );
    await store.addInteraction({
      leadId: lead.id,
      kind: 'note',
      body: 'Met at booth 12',
      authorId: null,
    });
    await store.addInteraction({
      leadId: lead.id,
      kind: 'whatsapp',
      body: 'Sent 5 designs',
      authorId: null,
    });
    const page = await store.listInteractions(lead.id);
    expect(page.items).toHaveLength(2);
    expect(page.items[0]?.body).toBe('Met at booth 12');
  });

  it('roundtrips a setting and bumps version on overwrite', async () => {
    const created = expectOk(await store.putSetting('event_mode', true, 'global'));
    expect(created.version).toBe(1);
    const updated = expectOk(await store.putSetting('event_mode', false, 'global'));
    expect(updated.version).toBe(2);
    const read = await store.getSetting('event_mode');
    expect(read?.value).toBe(false);
  });

  it('adds and lists catalog photos', async () => {
    await store.addPhoto({
      storageKey: 'catalog/design-1.jpg',
      url: 'https://media.example.app/design-1.jpg',
      mime: 'image/jpeg',
      tags: ['sarees', 'silk'],
      price: 1200,
    });
    const photos = await store.listPhotos();
    expect(photos).toHaveLength(1);
    expect(photos[0]?.tags).toContain('silk');
  });

  it('dedupes salespeople by phone', async () => {
    await store.upsertSalesperson({ phone: '9111111111', name: 'Sales A' });
    await store.upsertSalesperson({ phone: '+919111111111', name: 'Sales A (renamed)' });
    const people = await store.listSalespeople();
    expect(people).toHaveLength(1);
    expect(people[0]?.name).toBe('Sales A (renamed)');
  });
});
