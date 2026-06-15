import { describe, it, expect, beforeEach } from 'vitest';
import { POST, GET } from './route';
import { setStorage, setActiveSchema } from '@/lib/runtime';
import { InMemoryStorageProvider } from '@/lib/storage/in-memory-adapter';
import { defaultLeadSchema } from '@/lib/schema/default-lead-schema';

function postReq(body: unknown): Request {
  return new Request('https://x/api/leads', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  setStorage(new InMemoryStorageProvider());
  setActiveSchema(defaultLeadSchema);
});

describe('POST /api/leads', () => {
  it('creates a valid lead (201)', async () => {
    const res = await POST(
      postReq({ data: { name: 'Ramesh', phone: '9876543210', interests: ['sarees'] } }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; lead: { phone: string } };
    expect(body.ok).toBe(true);
    expect(body.lead.phone).toBe('+919876543210');
  });

  it('rejects an invalid lead with 400 and issues', async () => {
    const res = await POST(postReq({ data: { phone: '9876543210', interests: ['sarees'] } }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues?: unknown[] };
    expect(body.error).toBe('validation_failed');
    expect(body.issues?.length).toBeGreaterThan(0);
  });

  it('rejects a request with no data (400)', async () => {
    const res = await POST(postReq({ source: 'manual' }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/leads', () => {
  it('lists saved leads', async () => {
    await POST(postReq({ data: { name: 'Ramesh', phone: '9876543210', interests: ['sarees'] } }));
    const res = await GET();
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items).toHaveLength(1);
  });
});
