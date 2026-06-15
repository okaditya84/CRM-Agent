import { describe, it, expect, beforeEach } from 'vitest';
import { POST, GET } from './route';
import { setStorage, setMediaStore } from '@/lib/runtime';
import { InMemoryStorageProvider } from '@/lib/storage/in-memory-adapter';
import { LocalMediaStore } from '@/lib/media/local';

function uploadReq(file: File, fields: Record<string, string> = {}): Request {
  const fd = new FormData();
  fd.append('file', file);
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return new Request('https://x/api/photos', { method: 'POST', body: fd });
}

beforeEach(() => {
  setStorage(new InMemoryStorageProvider());
  setMediaStore(new LocalMediaStore());
});

describe('POST /api/photos', () => {
  it('stores an uploaded image and creates a catalog entry', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'design.png', { type: 'image/png' });
    const res = await POST(uploadReq(file, { caption: 'Silk saree', tags: 'sarees, silk', price: '1200' }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      ok: boolean;
      photo: { url: string; caption?: string; tags: string[]; price?: number };
    };
    expect(body.ok).toBe(true);
    expect(body.photo.url).toContain('/api/media/');
    expect(body.photo.caption).toBe('Silk saree');
    expect(body.photo.tags).toEqual(['sarees', 'silk']);
    expect(body.photo.price).toBe(1200);
  });

  it('rejects a non-image upload', async () => {
    const file = new File([new Uint8Array([0])], 'note.txt', { type: 'text/plain' });
    const res = await POST(uploadReq(file));
    expect(res.status).toBe(400);
  });

  it('rejects a request with no file', async () => {
    const res = await POST(new Request('https://x/api/photos', { method: 'POST', body: new FormData() }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/photos', () => {
  it('lists uploaded photos', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'd.png', { type: 'image/png' });
    await POST(uploadReq(file));
    const res = await GET();
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items).toHaveLength(1);
  });
});
