import type { I18nText } from './types';

/**
 * Resolve a localized string, falling back to English and then to any available
 * translation so the UI never renders an empty label.
 */
export function resolveI18n(text: I18nText, locale: string): string {
  return text[locale] ?? text.en ?? Object.values(text)[0] ?? '';
}
