import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { defaultLeadSchema } from '@/lib/schema/default-lead-schema';
import { NewLeadClient } from '@/components/leads/NewLeadClient';

export default function NewLeadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('leads');

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-8 pb-20">
        <h1 className="text-3xl font-bold tracking-tight">{t('newTitle')}</h1>
        <p className="mt-2 mb-6 text-pretty leading-relaxed text-muted">{t('newSubtitle')}</p>
        <NewLeadClient schema={defaultLeadSchema} />
      </main>
    </div>
  );
}
