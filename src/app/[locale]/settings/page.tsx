import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { SettingsClient } from '@/components/settings/SettingsClient';

export default function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('settings');

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-8 pb-20">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-2 mb-6 text-pretty leading-relaxed text-muted">{t('subtitle')}</p>
        <SettingsClient />
      </main>
    </div>
  );
}
