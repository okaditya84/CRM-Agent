/**
 * WhatsApp webhook security. Uses Web Crypto (available in Node 18+ and
 * Cloudflare Workers) so the same code runs in local dev and on the edge.
 */

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string comparison to avoid timing leaks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** HMAC-SHA256 of `body` keyed by `secret`, hex-encoded. */
export async function computeSignature(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return toHex(sig);
}

/**
 * Verify Meta's `X-Hub-Signature-256` header (format: "sha256=<hex>") against
 * the raw request body and your App Secret.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  const provided = signatureHeader.slice('sha256='.length);
  const expected = await computeSignature(appSecret, rawBody);
  return timingSafeEqual(provided, expected);
}

/**
 * Handle the webhook verification handshake (GET). Returns the challenge to echo
 * back when the mode and token match, otherwise null (caller responds 403).
 */
export function verifyWebhookChallenge(
  params: { mode?: string | null; token?: string | null; challenge?: string | null },
  verifyToken: string,
): string | null {
  if (params.mode === 'subscribe' && params.token === verifyToken) {
    return params.challenge ?? '';
  }
  return null;
}
