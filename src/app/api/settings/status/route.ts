import { getLlmProvider, getMediaStore, getWhatsApp } from '@/lib/runtime';

export const dynamic = 'force-dynamic';

/** Report which integrations are configured, for the settings dashboard. */
export async function GET(): Promise<Response> {
  const status = {
    whatsapp: getWhatsApp() !== null,
    llm: getLlmProvider() !== null,
    sheets: Boolean(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    mediaDurable: getMediaStore().capabilities().durable,
  };
  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
