import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from './route';
import { setStorage, setMediaStore, setWhatsApp, getStorage, getMediaStore } from '@/lib/runtime';
import { InMemoryStorageProvider } from '@/lib/storage/in-memory-adapter';
import { LocalMediaStore } from '@/lib/media/local';
import { FakeWhatsAppProvider } from '@/lib/whatsapp/fake-provider';

function sendReq(body: unknown): Request {
  return new Request('https://x/api/leads/abc/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function makeLeadWithPhoto() {
  const storage = getStorage();
  const media = getMediaStore();
  const lead = await storage.upsertLeadByPhone({ phone: '+919876543210', data: {}, source: 'manual' });
  const stored = await media.put(new Uint8Array([1, 2, 3]), 'image/jpeg');
  const photo = await storage.addPhoto({ storageKey: stored.key, url: stored.url, mime: 'image/jpeg', tags: [] });
  if (!lead.ok || !photo.ok) throw new Error('setup failed');
  return { leadId: lead.record.id, photoId: photo.record.id };
}

beforeEach(() => {
  setStorage(new InMemoryStorageProvider());
  setMediaStore(new LocalMediaStore());
  setWhatsApp(new FakeWhatsAppProvider());
});

describe('POST /api/leads/[id]/send', () => {
  it('returns 503 when WhatsApp is not configured', async () => {
    setWhatsApp(null);
    const res = await POST(sendReq({ photoIds: ['x'] }), { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(503);
  });

  it('returns 404 for an unknown lead', async () => {
    const res = await POST(sendReq({ photoIds: ['x'] }), { params: Promise.resolve({ id: 'missing' }) });
    expect(res.status).toBe(404);
  });

  it('sends selected photos to a real lead', async () => {
    const { leadId, photoId } = await makeLeadWithPhoto();
    const res = await POST(
      sendReq({ photoIds: [photoId], message: 'Namaste' }),
      { params: Promise.resolve({ id: leadId }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; sent: number; messageSent: boolean };
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);
    expect(body.messageSent).toBe(true);
  });

  it('rejects an empty send (400)', async () => {
    const { leadId } = await makeLeadWithPhoto();
    const res = await POST(sendReq({ photoIds: [] }), { params: Promise.resolve({ id: leadId }) });
    expect(res.status).toBe(400);
  });
});
