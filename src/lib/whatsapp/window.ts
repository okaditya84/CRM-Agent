/**
 * Service-window tracking. Inside an open window you may send free-form messages
 * and photos for free; once it closes, only an approved template can re-engage.
 *
 * A normal customer-initiated message (QR / wa.me) opens a 24h window. A
 * Click-to-WhatsApp / Page-CTA lead opens a 72h free-entry window.
 */
export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const FREE_ENTRY_WINDOW_MS = 72 * 60 * 60 * 1000;

export interface ConversationWindow {
  lastInboundAt: string | null; // ISO8601
  expiresAt: string | null; // ISO8601
  isFreeEntryPoint: boolean;
}

export function computeWindowExpiry(lastInboundIso: string, isFreeEntryPoint: boolean): string {
  const ms = isFreeEntryPoint ? FREE_ENTRY_WINDOW_MS : SERVICE_WINDOW_MS;
  return new Date(new Date(lastInboundIso).getTime() + ms).toISOString();
}

/** A new inbound message (re)opens/extends the window. */
export function openWindowOnInbound(
  occurredAtIso: string,
  isFreeEntryPoint: boolean,
): ConversationWindow {
  return {
    lastInboundAt: occurredAtIso,
    expiresAt: computeWindowExpiry(occurredAtIso, isFreeEntryPoint),
    isFreeEntryPoint,
  };
}

export function isWindowOpen(
  expiresAtIso: string | null,
  nowIso: string = new Date().toISOString(),
): boolean {
  if (!expiresAtIso) return false;
  return new Date(nowIso).getTime() < new Date(expiresAtIso).getTime();
}

/** Milliseconds left in the window (0 if closed) — for a live countdown in the UI. */
export function windowMsRemaining(
  expiresAtIso: string | null,
  nowIso: string = new Date().toISOString(),
): number {
  if (!expiresAtIso) return 0;
  return Math.max(0, new Date(expiresAtIso).getTime() - new Date(nowIso).getTime());
}

/** Whether a free-form (non-template) message is allowed right now. */
export function canSendFreeform(
  window: ConversationWindow,
  nowIso: string = new Date().toISOString(),
): boolean {
  return isWindowOpen(window.expiresAt, nowIso);
}
