import { getMediaStore, getStorage, getWhatsApp } from '@/lib/runtime';
import { sendPhotosToLead } from '@/lib/send-service';

export const dynamic = 'force-dynamic';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Send selected catalog photos (and an optional message) to a lead on WhatsApp. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const whatsapp = getWhatsApp();
  if (!whatsapp) return json({ error: 'whatsapp_not_configured' }, 503);

  const { id } = await ctx.params;
  const lead = await getStorage().getLead(id);
  if (!lead) return json({ error: 'lead_not_found' }, 404);

  const body = (await req.json().catch(() => null)) as
    | { photoIds?: unknown; message?: unknown }
    | null;
  const photoIds = Array.isArray(body?.photoIds)
    ? (body.photoIds as unknown[]).filter((p): p is string => typeof p === 'string')
    : [];
  if (photoIds.length === 0 && !(typeof body?.message === 'string' && body.message.trim())) {
    return json({ error: 'nothing_to_send' }, 400);
  }

  const result = await sendPhotosToLead({
    whatsapp,
    media: getMediaStore(),
    storage: getStorage(),
    lead,
    photoIds,
    message: typeof body?.message === 'string' ? body.message : undefined,
  });

  return json({ ok: true, ...result });
}
