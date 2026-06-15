/**
 * Build a wa.me deep link that opens WhatsApp with a prefilled message. The
 * customer sending this message opens the free 24h window (Path A) — the cheapest
 * and simplest way to start a conversation at a fair.
 */
export function buildWaLink(phone: string, prefillText = ''): string {
  const digits = phone.replace(/\D/g, '');
  const base = `https://wa.me/${digits}`;
  return prefillText ? `${base}?text=${encodeURIComponent(prefillText)}` : base;
}
