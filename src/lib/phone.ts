/**
 * Normalize a user-entered phone number to E.164 (e.g. "+919812345678").
 * Defaults to India (+91) when no country code is present — the common case at
 * a domestic textile fair. Returns null if the input can't be a valid number.
 *
 * Shared by the lead form and the storage layer so the same number is always
 * stored in one canonical shape (which makes phone-based dedup reliable).
 */
export function normalizePhone(input: string, defaultCountryCode = '91'): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Already international.
  if (trimmed.startsWith('+')) {
    const rest = trimmed.slice(1).replace(/\D/g, '');
    return rest.length >= 8 && rest.length <= 15 ? `+${rest}` : null;
  }

  let digits = trimmed.replace(/\D/g, '');
  // Local trunk prefix (e.g. 0XXXXXXXXXX) → strip the leading 0.
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Bare national number → prepend the default country code.
  if (digits.length === 10) {
    return `+${defaultCountryCode}${digits}`;
  }
  // Includes a country code but no '+'.
  if (digits.length > 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

/** True if the value is already a valid E.164 string. */
export function isE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}
