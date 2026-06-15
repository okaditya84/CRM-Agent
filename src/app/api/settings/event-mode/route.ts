import { getStorage } from '@/lib/runtime';
import { getEventState, setEventMode, setAutomationHalt } from '@/lib/event-mode';

export const dynamic = 'force-dynamic';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function GET(): Promise<Response> {
  return json(await getEventState(getStorage()));
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as
    | { eventMode?: unknown; automationHalt?: unknown }
    | null;
  if (!body) return json({ error: 'bad_request' }, 400);

  const storage = getStorage();
  if (typeof body.eventMode === 'boolean') await setEventMode(storage, body.eventMode);
  if (typeof body.automationHalt === 'boolean') await setAutomationHalt(storage, body.automationHalt);
  return json(await getEventState(storage));
}
