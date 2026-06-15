import type {
  InboundKind,
  MessageStatus,
  TemplateStatus,
  WhatsAppDomainEvent,
} from '../types';

/** Meta sends unix-seconds timestamps as strings. */
function toIso(ts: unknown): string {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return new Date(0).toISOString();
  return new Date(n * 1000).toISOString();
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}
function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

const KNOWN_KINDS: InboundKind[] = ['text', 'image', 'audio', 'video', 'document'];

function inboundKind(type: string): InboundKind {
  return (KNOWN_KINDS as string[]).includes(type) ? (type as InboundKind) : 'other';
}

/**
 * Normalize a Meta webhook body into provider-neutral domain events.
 * Tolerant of missing/partial fields — never throws on malformed input.
 */
export function parseWebhook(body: unknown): WhatsAppDomainEvent[] {
  const events: WhatsAppDomainEvent[] = [];
  const root = asRecord(body);

  for (const entry of asArray(root.entry)) {
    for (const change of asArray(asRecord(entry).changes)) {
      const ch = asRecord(change);
      const field = asString(ch.field);
      const value = asRecord(ch.value);

      if (field === 'messages') {
        const phoneNumberId = asString(asRecord(value.metadata).phone_number_id);
        const contacts = asArray(value.contacts).map(asRecord);
        const nameByWaId = new Map<string, string>();
        for (const c of contacts) {
          const waId = asString(c.wa_id);
          const name = asString(asRecord(c.profile).name);
          if (waId && name) nameByWaId.set(waId, name);
        }

        for (const m of asArray(value.messages)) {
          const msg = asRecord(m);
          const from = asString(msg.from);
          const type = asString(msg.type);
          const kind = inboundKind(type);
          const media = asRecord(msg[type as keyof typeof msg]);
          events.push({
            type: 'InboundMessageReceived',
            conversationId: from,
            from,
            contactName: nameByWaId.get(from),
            providerMessageId: asString(msg.id),
            kind,
            text: type === 'text' ? asString(asRecord(msg.text).body) : undefined,
            media:
              kind === 'image' || kind === 'video' || kind === 'document' || kind === 'audio'
                ? {
                    id: asString(media.id),
                    mime: asString(media.mime_type) || undefined,
                    caption: asString(media.caption) || undefined,
                  }
                : undefined,
            isFreeEntryPoint: 'referral' in msg,
            phoneNumberId,
            occurredAt: toIso(msg.timestamp),
          });
        }

        for (const s of asArray(value.statuses)) {
          const st = asRecord(s);
          const firstError = asArray(st.errors).map(asRecord)[0] ?? {};
          events.push({
            type: 'MessageStatusChanged',
            providerMessageId: asString(st.id),
            status: asString(st.status) as MessageStatus,
            recipientId: asString(st.recipient_id),
            errorCode:
              typeof firstError.code === 'number' ? (firstError.code as number) : undefined,
            errorTitle: asString(firstError.title) || undefined,
            occurredAt: toIso(st.timestamp),
          });
        }
      } else if (field === 'message_template_status_update') {
        events.push({
          type: 'TemplateStatusChanged',
          templateName: asString(value.message_template_name),
          language: asString(value.message_template_language) || undefined,
          status: asString(value.event) as TemplateStatus,
          reason: asString(value.reason) || undefined,
        });
      }
    }
  }

  return events;
}
