import { describe, it, expect, beforeEach } from 'vitest';
import { sendPhotosToLead } from './send-service';
import { InMemoryStorageProvider } from './storage/in-memory-adapter';
import { LocalMediaStore } from './media/local';
import { FakeWhatsAppProvider } from './whatsapp/fake-provider';
import type { Lead } from './storage/types';

async function seed(storage: InMemoryStorageProvider, media: LocalMediaStore) {
  const leadRes = await storage.upsertLeadByPhone({
    phone: '+919876543210',
    data: { name: 'Ramesh' },
    source: 'manual',
  });
  if (!leadRes.ok) throw new Error('seed lead failed');
  const lead = leadRes.record as Lead;

  const photoIds: string[] = [];
  for (let i = 0; i < 2; i++) {
    const stored = await media.put(new Uint8Array([i, i + 1, i + 2]), 'image/jpeg');
    const p = await storage.addPhoto({
      storageKey: stored.key,
      url: stored.url,
      mime: 'image/jpeg',
      caption: `Design ${i}`,
      tags: [],
    });
    if (p.ok) photoIds.push(p.record.id);
  }
  return { lead, photoIds };
}

describe('sendPhotosToLead', () => {
  let storage: InMemoryStorageProvider;
  let media: LocalMediaStore;

  beforeEach(() => {
    storage = new InMemoryStorageProvider();
    media = new LocalMediaStore();
  });

  it('uploads and sends each photo in order, plus an optional message', async () => {
    const { lead, photoIds } = await seed(storage, media);
    const whatsapp = new FakeWhatsAppProvider();

    const result = await sendPhotosToLead({
      whatsapp,
      media,
      storage,
      lead,
      photoIds,
      message: 'Namaste! Here are some designs.',
    });

    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.messageSent).toBe(true);
    expect(whatsapp.uploads).toHaveLength(2);
    expect(whatsapp.images).toHaveLength(2);
    expect(whatsapp.texts).toHaveLength(1);
    // recipient is digits without '+'
    expect(whatsapp.images[0]?.to).toBe('919876543210');

    const interactions = await storage.listInteractions(lead.id);
    expect(interactions.items).toHaveLength(1);
    expect(interactions.items[0]?.kind).toBe('whatsapp');
  });

  it('reports a per-photo error when the upload fails', async () => {
    const { lead, photoIds } = await seed(storage, media);
    const whatsapp = new FakeWhatsAppProvider({ failUploads: true });
    const result = await sendPhotosToLead({ whatsapp, media, storage, lead, photoIds });
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.results.every((r) => r.error === 'upload_failed')).toBe(true);
  });

  it('flags a missing photo id', async () => {
    const { lead } = await seed(storage, media);
    const whatsapp = new FakeWhatsAppProvider();
    const result = await sendPhotosToLead({ whatsapp, media, storage, lead, photoIds: ['nope'] });
    expect(result.results[0]).toMatchObject({ ok: false, error: 'photo_not_found' });
  });
});
