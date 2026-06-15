import { getStorage, getActiveSchema } from '@/lib/runtime';
import { saveLead } from '@/lib/lead-service';
import type { LeadSource } from '@/lib/storage/types';

export const dynamic = 'force-dynamic';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Create (or idempotently update) a lead. */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as
    | { data?: unknown; source?: unknown }
    | null;
  if (!body || typeof body !== 'object') return json({ error: 'bad_request' }, 400);
  if (!body.data || typeof body.data !== 'object') {
    return json({ error: 'missing_data' }, 400);
  }

  const result = await saveLead({
    storage: getStorage(),
    schema: getActiveSchema(),
    data: body.data as Record<string, unknown>,
    source: (body.source as LeadSource) ?? 'manual',
  });

  if (result.ok) return json({ ok: true, lead: result.lead }, 201);
  const status = result.error === 'validation_failed' ? 400 : 409;
  return json(result, status);
}

/** List leads (most recent first). */
export async function GET(): Promise<Response> {
  const page = await getStorage().listLeads({ limit: 200 });
  return json({ items: page.items });
}
