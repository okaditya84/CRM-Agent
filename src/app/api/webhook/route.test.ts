import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET, POST } from './route';
import { computeSignature } from '@/lib/whatsapp';
import {
  setWebhookEventHandler,
  dispatchWebhookEvents,
} from '@/lib/whatsapp/webhook-handler';
import type { WhatsAppDomainEvent } from '@/lib/whatsapp';

const VERIFY_TOKEN = 'verify-tok';
const APP_SECRET = 'app-secret';

beforeEach(() => {
  process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN;
  process.env.WHATSAPP_APP_SECRET = APP_SECRET;
});
afterEach(() => {
  setWebhookEventHandler(null);
});

describe('GET /api/webhook (handshake)', () => {
  it('echoes the challenge when the verify token matches', async () => {
    const url = `https://x/api/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=42`;
    const res = await GET(new Request(url));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('42');
  });

  it('rejects a wrong verify token', async () => {
    const url = `https://x/api/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=42`;
    const res = await GET(new Request(url));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/webhook (inbound)', () => {
  const payload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              metadata: { phone_number_id: 'PNID' },
              messages: [
                { from: '919812345678', id: 'wamid.A', timestamp: '1718000000', type: 'text', text: { body: 'Hi' } },
              ],
            },
          },
        ],
      },
    ],
  });

  async function signedRequest(body: string, secret = APP_SECRET) {
    const sig = await computeSignature(secret, body);
    return new Request('https://x/api/webhook', {
      method: 'POST',
      headers: { 'x-hub-signature-256': `sha256=${sig}` },
      body,
    });
  }

  it('accepts a correctly signed payload and dispatches parsed events', async () => {
    const captured: WhatsAppDomainEvent[] = [];
    setWebhookEventHandler((events) => {
      captured.push(...events);
    });

    const res = await POST(await signedRequest(payload));
    expect(res.status).toBe(200);
    expect(captured).toHaveLength(1);
    expect(captured[0]?.type).toBe('InboundMessageReceived');
  });

  it('rejects an invalid signature with 401', async () => {
    const res = await POST(await signedRequest(payload, 'wrong-secret'));
    expect(res.status).toBe(401);
  });

  it('dispatch is a no-op when no handler is registered', async () => {
    setWebhookEventHandler(null);
    await expect(dispatchWebhookEvents([])).resolves.toBeUndefined();
  });
});
