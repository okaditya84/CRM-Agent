/**
 * Provider-neutral WhatsApp domain types. The Meta Cloud adapter maps Meta's
 * JSON to these; the rest of the app never sees Meta-specific shapes, so an
 * unofficial adapter could be swapped in behind the same types.
 */

export type Phone = string; // E.164 without notes; Meta uses wa_id (no '+')

/** Reference to a media asset — either an uploaded Media ID or a public URL. */
export type MediaRef =
  | { kind: 'id'; id: string; caption?: string }
  | { kind: 'url'; url: string; caption?: string };

export interface SendOk {
  ok: true;
  providerMessageId: string;
}
export interface SendErr {
  ok: false;
  error: string;
  code?: number;
  retriable?: boolean;
}
export type SendResult = SendOk | SendErr;

export interface MediaUploadResult {
  ok: boolean;
  mediaId?: string;
  error?: string;
}

export type InboundKind = 'text' | 'image' | 'audio' | 'video' | 'document' | 'other';

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export type TemplateStatus =
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING'
  | 'PAUSED'
  | 'DISABLED'
  | 'FLAGGED';

// --- Domain events emitted from an inbound webhook --------------------------

export interface InboundMessageReceived {
  type: 'InboundMessageReceived';
  /** Stable conversation id = the customer's wa_id. */
  conversationId: string;
  from: string; // wa_id (digits, no '+')
  contactName?: string;
  providerMessageId: string; // wamid
  kind: InboundKind;
  text?: string;
  media?: { id: string; mime?: string; caption?: string };
  /** True when the message came from a Click-to-WhatsApp ad / Page CTA (72h free window). */
  isFreeEntryPoint: boolean;
  phoneNumberId: string;
  occurredAt: string; // ISO8601
}

export interface MessageStatusChanged {
  type: 'MessageStatusChanged';
  providerMessageId: string;
  status: MessageStatus;
  recipientId: string;
  errorCode?: number;
  errorTitle?: string;
  occurredAt: string;
}

export interface TemplateStatusChanged {
  type: 'TemplateStatusChanged';
  templateName: string;
  language?: string;
  status: TemplateStatus;
  reason?: string;
}

export type WhatsAppDomainEvent =
  | InboundMessageReceived
  | MessageStatusChanged
  | TemplateStatusChanged;
