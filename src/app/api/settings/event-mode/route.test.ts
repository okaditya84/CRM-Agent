import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { setStorage } from '@/lib/runtime';
import { InMemoryStorageProvider } from '@/lib/storage/in-memory-adapter';

function postReq(body: unknown): Request {
  return new Request('https://x/api/settings/event-mode', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  setStorage(new InMemoryStorageProvider());
});

describe('/api/settings/event-mode', () => {
  it('reports the default off state', async () => {
    const body = (await (await GET()).json()) as { eventMode: boolean; automationHalt: boolean };
    expect(body.eventMode).toBe(false);
    expect(body.automationHalt).toBe(false);
  });

  it('turns event mode on and the halt switch on', async () => {
    const first = (await (await POST(postReq({ eventMode: true }))).json()) as {
      eventMode: boolean;
    };
    expect(first.eventMode).toBe(true);

    const second = (await (await POST(postReq({ automationHalt: true }))).json()) as {
      eventMode: boolean;
      automationHalt: boolean;
    };
    expect(second.eventMode).toBe(true);
    expect(second.automationHalt).toBe(true);
  });
});
