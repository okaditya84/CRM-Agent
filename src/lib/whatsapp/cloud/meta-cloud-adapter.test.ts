import { describe, it, expect } from 'vitest';
import { MetaCloudAdapter } from './meta-cloud-adapter';

interface Captured {
  url: string;
  init: RequestInit;
}

function fakeFetch(responder: (url: string) => { status: number; body: unknown }) {
  const calls: Captured[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    const { status, body } = responder(url);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

function bodyOf(c: Captured): Record<string, unknown> {
  return JSON.parse(c.init.body as string) as Record<string, unknown>;
}

function adapter(fetchImpl: typeof fetch) {
  return new MetaCloudAdapter({
    accessToken: 'TOKEN',
    phoneNumberId: 'PNID',
    fetchImpl,
  });
}

describe('MetaCloudAdapter', () => {
  it('sends a text message and returns the provider message id', async () => {
    const { fn, calls } = fakeFetch(() => ({ status: 200, body: { messages: [{ id: 'wamid.X' }] } }));
    const result = await adapter(fn).sendText('919812345678', 'Hello');

    expect(result).toEqual({ ok: true, providerMessageId: 'wamid.X' });
    expect(calls[0]?.url).toBe('https://graph.facebook.com/v21.0/PNID/messages');
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer TOKEN');
    const body = bodyOf(calls[0]!);
    expect(body.messaging_product).toBe('whatsapp');
    expect(body.type).toBe('text');
    expect((body.text as { body: string }).body).toBe('Hello');
  });

  it('surfaces a Graph API error with code', async () => {
    const { fn } = fakeFetch(() => ({
      status: 400,
      body: { error: { message: 'Invalid recipient', code: 131000 } },
    }));
    const result = await adapter(fn).sendText('x', 'hi');
    expect(result).toEqual({ ok: false, error: 'Invalid recipient', code: 131000, retriable: false });
  });

  it('sends an image by media id and by url', async () => {
    const { fn, calls } = fakeFetch(() => ({ status: 200, body: { messages: [{ id: 'm1' }] } }));
    const a = adapter(fn);
    await a.sendImage('919812345678', { kind: 'id', id: 'media-9', caption: 'design' });
    await a.sendImage('919812345678', { kind: 'url', url: 'https://x/p.jpg' });

    expect((bodyOf(calls[0]!).image as { id: string }).id).toBe('media-9');
    expect((bodyOf(calls[1]!).image as { link: string }).link).toBe('https://x/p.jpg');
  });

  it('sends a template with body parameters', async () => {
    const { fn, calls } = fakeFetch(() => ({ status: 200, body: { messages: [{ id: 't1' }] } }));
    await adapter(fn).sendTemplate('919812345678', 'first_contact', 'en', ['Ramesh', 'sarees']);

    const tpl = bodyOf(calls[0]!).template as {
      name: string;
      language: { code: string };
      components: Array<{ parameters: unknown[] }>;
    };
    expect(tpl.name).toBe('first_contact');
    expect(tpl.language.code).toBe('en');
    expect(tpl.components[0]?.parameters).toHaveLength(2);
  });

  it('sends images sequentially and preserves order', async () => {
    let n = 0;
    const { fn, calls } = fakeFetch(() => ({ status: 200, body: { messages: [{ id: `m${++n}` }] } }));
    const results = await adapter(fn).sendImagesSequential('919812345678', [
      { kind: 'id', id: 'a' },
      { kind: 'id', id: 'b' },
    ]);
    expect(results).toHaveLength(2);
    expect(calls).toHaveLength(2);
    expect((bodyOf(calls[0]!).image as { id: string }).id).toBe('a');
    expect((bodyOf(calls[1]!).image as { id: string }).id).toBe('b');
  });

  it('marks a message as read', async () => {
    const { fn, calls } = fakeFetch(() => ({ status: 200, body: { success: true } }));
    await adapter(fn).markRead('wamid.X');
    const body = bodyOf(calls[0]!);
    expect(body.status).toBe('read');
    expect(body.message_id).toBe('wamid.X');
  });

  it('uploads media and returns the media id', async () => {
    const { fn, calls } = fakeFetch((url) =>
      url.endsWith('/media')
        ? { status: 200, body: { id: 'media-uploaded' } }
        : { status: 404, body: {} },
    );
    const result = await adapter(fn).uploadMedia(new Uint8Array([1, 2, 3]), 'image/jpeg');
    expect(result).toEqual({ ok: true, mediaId: 'media-uploaded' });
    expect(calls[0]?.url).toBe('https://graph.facebook.com/v21.0/PNID/media');
  });
});
