import { describe, it, expect, beforeEach } from 'vitest';
import { GoogleSheetsAdapter } from './google-sheets-adapter';
import { FakeSheetsClient } from './fake-sheets-client';
import { SHEET_TITLES } from './entity-specs';
import { defaultLeadSchema } from '../../schema/default-lead-schema';
import type { FormSchema } from '../../schema/types';
import type { WriteResult } from '../types';

function expectOk<T>(result: WriteResult<T>): T {
  if (!result.ok) throw new Error(`expected ok, got "${result.reason}"`);
  return result.record;
}

describe('GoogleSheetsAdapter (against FakeSheetsClient)', () => {
  let client: FakeSheetsClient;
  let store: GoogleSheetsAdapter;

  beforeEach(() => {
    client = new FakeSheetsClient();
    store = new GoogleSheetsAdapter(client, defaultLeadSchema);
  });

  it('creates the Leads header and appends a normalized lead', async () => {
    const lead = expectOk(
      await store.upsertLeadByPhone({
        phone: '9876543210',
        data: { name: 'Ramesh', interests: ['sarees'] },
        source: 'manual',
      }),
    );
    expect(lead.phone).toBe('+919876543210');
    expect(lead.version).toBe(1);

    const header = await client.getHeader(SHEET_TITLES.leads);
    expect(header).toContain('phone');
    expect(header).toContain('interests');
    const rows = await client.getAllRows(SHEET_TITLES.leads);
    expect(rows).toHaveLength(1);
  });

  it('upserting the same number updates in place (no duplicate row)', async () => {
    await store.upsertLeadByPhone({
      phone: '+919876543210',
      data: { name: 'Ramesh', city: 'Surat' },
      source: 'manual',
    });
    const updated = expectOk(
      await store.upsertLeadByPhone({
        phone: '09876543210',
        data: { company: 'Patel Textiles' },
        source: 'whatsapp_bot',
      }),
    );
    expect(updated.version).toBe(2);
    expect(updated.data.name).toBe('Ramesh');
    expect(updated.data.company).toBe('Patel Textiles');

    const rows = await client.getAllRows(SHEET_TITLES.leads);
    expect(rows).toHaveLength(1);

    const found = await store.findLeadByPhone('98765 43210');
    expect(found?.data.city).toBe('Surat');
  });

  it('enforces best-effort optimistic concurrency on updateLead', async () => {
    const lead = expectOk(
      await store.upsertLeadByPhone({ phone: '9876543210', data: {}, source: 'manual' }),
    );
    expectOk(await store.updateLead(lead.id, { status: 'contacted' }, lead.version));
    const stale = await store.updateLead(lead.id, { status: 'won' }, lead.version);
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.reason).toBe('version_conflict');
  });

  it('rejects an invalid phone', async () => {
    const result = await store.upsertLeadByPhone({ phone: 'xx', data: {}, source: 'manual' });
    expect(result.ok).toBe(false);
  });

  it('appends and lists interactions, normalizing empty authorId to null', async () => {
    const lead = expectOk(
      await store.upsertLeadByPhone({ phone: '9876543210', data: {}, source: 'manual' }),
    );
    await store.addInteraction({
      leadId: lead.id,
      kind: 'note',
      body: 'Met at booth 12',
      authorId: null,
    });
    const page = await store.listInteractions(lead.id);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.authorId).toBeNull();
    expect(page.items[0]?.body).toBe('Met at booth 12');
  });

  it('roundtrips settings including JSON values', async () => {
    await store.putSetting('event_mode', true, 'global');
    await store.putSetting('llm', { provider: 'gemini', model: 'flash' }, 'global');
    expect((await store.getSetting('event_mode'))?.value).toBe(true);
    expect((await store.getSetting('llm'))?.value).toEqual({
      provider: 'gemini',
      model: 'flash',
    });
    // Overwrite bumps version.
    const updated = expectOk(await store.putSetting('event_mode', false, 'global'));
    expect(updated.version).toBe(2);
  });

  it('roundtrips catalog photos with array tags', async () => {
    await store.addPhoto({
      storageKey: 'catalog/d1.jpg',
      url: 'https://media.example.app/d1.jpg',
      mime: 'image/jpeg',
      tags: ['sarees', 'silk'],
      price: 1200,
    });
    const photos = await store.listPhotos();
    expect(photos).toHaveLength(1);
    expect(photos[0]?.tags).toEqual(['sarees', 'silk']);
    expect(photos[0]?.price).toBe(1200);
  });

  it('dedupes salespeople by phone', async () => {
    await store.upsertSalesperson({ phone: '9111111111', name: 'Sales A' });
    await store.upsertSalesperson({ phone: '+919111111111', name: 'Renamed' });
    const people = await store.listSalespeople();
    expect(people).toHaveLength(1);
    expect(people[0]?.name).toBe('Renamed');
  });

  it('grows the header when the schema gains a field, without breaking old rows', async () => {
    await store.upsertLeadByPhone({
      phone: '9876543210',
      data: { name: 'Ramesh' },
      source: 'manual',
    });

    // New adapter with an extra field, same underlying spreadsheet.
    const extended: FormSchema = {
      ...defaultLeadSchema,
      version: 2,
      fields: [
        ...defaultLeadSchema.fields,
        { key: 'gst', type: 'text', label: { en: 'GST' } },
      ],
    };
    const store2 = new GoogleSheetsAdapter(client, extended);

    const header = (await store2.listLeads()).items; // triggers ensureReady
    expect(header).toHaveLength(1);
    expect(await client.getHeader(SHEET_TITLES.leads)).toContain('gst');

    // Existing lead still reads; new field writes fine.
    const updated = expectOk(
      await store2.upsertLeadByPhone({
        phone: '9876543210',
        data: { gst: '24ABCDE1234F1Z5' },
        source: 'manual',
      }),
    );
    expect(updated.data.gst).toBe('24ABCDE1234F1Z5');
    expect(updated.data.name).toBe('Ramesh');
    const rows = await client.getAllRows(SHEET_TITLES.leads);
    expect(rows).toHaveLength(1);
  });
});
