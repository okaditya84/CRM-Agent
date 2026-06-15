import { getActiveSchema, getLlmProvider } from '@/lib/runtime';
import { normalizeLead } from '@/lib/llm/normalize';

export const dynamic = 'force-dynamic';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Turn a free-form note into a structured lead draft for the form to pre-fill. */
export async function POST(req: Request): Promise<Response> {
  const llm = getLlmProvider();
  if (!llm) return json({ error: 'llm_not_configured' }, 503);

  const body = (await req.json().catch(() => null)) as
    | { text?: unknown; locale?: unknown }
    | null;
  const text = body?.text;
  if (typeof text !== 'string' || !text.trim()) {
    return json({ error: 'missing_text' }, 400);
  }
  const locale = typeof body?.locale === 'string' ? body.locale : 'en';

  const result = await normalizeLead({
    schema: getActiveSchema(),
    text,
    provider: llm,
    locale,
  });
  return json(result);
}
