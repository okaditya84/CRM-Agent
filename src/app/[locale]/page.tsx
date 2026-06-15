import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Link } from '@/i18n/navigation';

const FEATURE_KEYS = ['capture', 'send', 'team'] as const;

const FEATURE_ICONS: Record<(typeof FEATURE_KEYS)[number], string> = {
  capture: 'M12 4v16m8-8H4', // plus
  send: 'M3 11l18-7-7 18-2.5-7.5L3 11z', // paper plane
  team: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1a4 4 0 100-8 4 4 0 000 8z', // people
};

export default function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('home');
  const tApp = useTranslations('app');

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
            स
          </span>
          <span className="text-lg font-semibold tracking-tight">
            {tApp('name')}
          </span>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-12 sm:py-20">
          <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary">
            {t('eyebrow')}
          </span>
          <h1 className="mt-5 max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted">
            {t('subtitle')}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/leads/new"
              className="rounded-xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
            >
              {t('ctaPrimary')}
            </Link>
            <a
              href="https://github.com/okaditya84/CRM-Agent/blob/main/docs/SETUP.md"
              className="rounded-xl border border-border bg-surface px-5 py-3 text-base font-semibold text-foreground transition-colors hover:bg-surface-2"
            >
              {t('ctaSecondary')}
            </a>
            <span className="ml-1 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-sm text-muted">
              <span className="h-2 w-2 rounded-full bg-accent" />
              {t('phaseBadge')}
            </span>
          </div>
        </section>

        <section className="grid gap-5 pb-20 sm:grid-cols-3">
          {FEATURE_KEYS.map((key) => (
            <article
              key={key}
              className="rounded-xl border border-border bg-surface p-6 shadow-sm"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={FEATURE_ICONS[key]} />
                </svg>
              </span>
              <h3 className="mt-4 text-lg font-semibold">
                {t(`features.${key}.title`)}
              </h3>
              <p className="mt-2 text-pretty leading-relaxed text-muted">
                {t(`features.${key}.body`)}
              </p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
