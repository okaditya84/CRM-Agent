'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

/**
 * Runtime language switch. Renders one pill per supported locale, driven by
 * routing.locales — adding a language requires no change here.
 */
export function LanguageSwitcher() {
  const t = useTranslations('language');
  const activeLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function selectLocale(locale: string) {
    if (locale === activeLocale) return;
    startTransition(() => {
      router.replace(pathname, { locale });
    });
  }

  return (
    <div
      role="group"
      aria-label={t('label')}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5 shadow-sm',
        isPending && 'opacity-60',
      )}
    >
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => selectLocale(locale)}
            aria-pressed={isActive}
            disabled={isPending}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted hover:bg-surface-2 hover:text-foreground',
            )}
          >
            {t(locale)}
          </button>
        );
      })}
    </div>
  );
}
