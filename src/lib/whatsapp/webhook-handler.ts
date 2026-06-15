import type { WhatsAppDomainEvent } from './types';

/**
 * Dispatch seam between the webhook route (which only verifies, parses, and acks
 * fast) and downstream processing (persist lead, run the bot). Later phases
 * register a handler here; in serverless this is where work is enqueued.
 */
export type WebhookEventHandler = (
  events: WhatsAppDomainEvent[],
) => void | Promise<void>;

let currentHandler: WebhookEventHandler | null = null;

export function setWebhookEventHandler(handler: WebhookEventHandler | null): void {
  currentHandler = handler;
}

export async function dispatchWebhookEvents(events: WhatsAppDomainEvent[]): Promise<void> {
  if (events.length === 0 || !currentHandler) return;
  await currentHandler(events);
}
