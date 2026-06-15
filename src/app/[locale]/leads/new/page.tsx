import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Link } from '@/i18n/navigation';
import { defaultLeadSchema } from '@/lib/schema/default-lead-schema';
import { NewLeadClient } from '@/components/leads/NewLeadClient';

export default function NewLeadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('leads');
  const tApp = useTranslations('app');

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
            स
          </span>
          <span className="text-lg font-semibold tracking-tight">{tApp('name')}</span>
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-20">
        <h1 className="text-3xl font-bold tracking-tight">{t('newTitle')}</h1>
        <p className="mt-2 mb-6 text-pretty leading-relaxed text-muted">{t('newSubtitle')}</p>
        <NewLeadClient schema={defaultLeadSchema} />
      </main>
    </div>
  );
}
