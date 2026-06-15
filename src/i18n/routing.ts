import { defineRouting } from 'next-intl/routing';

/**
 * Single source of truth for supported languages.
 *
 * Adding a language is intentionally trivial — append its code here and drop a
 * matching `messages/<code>.json` catalog. No other code changes are required.
 */
export const routing = defineRouting({
  locales: ['en', 'hi', 'gu'],
  defaultLocale: 'en',
  // Keep the default locale prefix explicit (/en) so language is always in the URL.
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
