import {
  parseWebhook,
  verifyWebhookChallenge,
  verifyWebhookSignature,
} from '@/lib/whatsapp';
import { dispatchWebhookEvents } from '@/lib/whatsapp/webhook-handler';

// Always dynamic: this endpoint must run per-request, never be cached/prerendered.
export const dynamic = 'force-dynamic';

/** Meta webhook verification handshake. */
export async function GET(req: Request): Promise<Response> {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) return new Response('not_configured', { status: 503 });

  const url = new URL(req.url);
  const challenge = verifyWebhookChallenge(
    {
      mode: url.searchParams.get('hub.mode'),
      token: url.searchParams.get('hub.verify_token'),
      challenge: url.searchParams.get('hub.challenge'),
    },
    verifyToken,
  );
  return challenge !== null
    ? new Response(challenge, { status: 200 })
    : new Response('forbidden', { status: 403 });
}

/**
 * Inbound messages and statuses. Verify signature → parse → hand off → ack fast.
 * We always return 200 once the signature is valid so Meta doesn't retry; any
 * downstream error is swallowed (and will be handled by the processing layer).
 */
export async function POST(req: Request): Promise<Response> {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return new Response('not_configured', { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get('x-hub-signature-256');
  const valid = await verifyWebhookSignature(raw, signature, appSecret);
  if (!valid) return new Response('invalid_signature', { status: 401 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response('bad_json', { status: 400 });
  }

  const events = parseWebhook(body);
  try {
    await dispatchWebhookEvents(events);
  } catch {
    // Never fail the ack on downstream errors — Meta would retry and duplicate.
  }
  return new Response('ok', { status: 200 });
}
