import { describe, it, expect } from 'vitest';
import {
  computeSignature,
  verifyWebhookSignature,
  verifyWebhookChallenge,
} from './signature';

const SECRET = 'app-secret-123';
const BODY = '{"object":"whatsapp_business_account","entry":[]}';

describe('webhook signature', () => {
  it('computes a 64-char hex HMAC', async () => {
    const sig = await computeSignature(SECRET, BODY);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifies a correctly signed body', async () => {
    const sig = await computeSignature(SECRET, BODY);
    expect(await verifyWebhookSignature(BODY, `sha256=${sig}`, SECRET)).toBe(true);
  });

  it('rejects a tampered body', async () => {
    const sig = await computeSignature(SECRET, BODY);
    expect(await verifyWebhookSignature(BODY + ' ', `sha256=${sig}`, SECRET)).toBe(false);
  });

  it('rejects a wrong secret', async () => {
    const sig = await computeSignature(SECRET, BODY);
    expect(await verifyWebhookSignature(BODY, `sha256=${sig}`, 'other')).toBe(false);
  });

  it('rejects missing or malformed headers', async () => {
    expect(await verifyWebhookSignature(BODY, null, SECRET)).toBe(false);
    expect(await verifyWebhookSignature(BODY, 'deadbeef', SECRET)).toBe(false);
  });
});

describe('webhook challenge handshake', () => {
  it('echoes the challenge when mode and token match', () => {
    expect(
      verifyWebhookChallenge(
        { mode: 'subscribe', token: 'verify-tok', challenge: '12345' },
        'verify-tok',
      ),
    ).toBe('12345');
  });

  it('returns null on token mismatch or wrong mode', () => {
    expect(
      verifyWebhookChallenge(
        { mode: 'subscribe', token: 'wrong', challenge: '12345' },
        'verify-tok',
      ),
    ).toBeNull();
    expect(
      verifyWebhookChallenge(
        { mode: 'unsubscribe', token: 'verify-tok', challenge: '12345' },
        'verify-tok',
      ),
    ).toBeNull();
  });
});
