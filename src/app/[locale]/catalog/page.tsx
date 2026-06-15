import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { CatalogClient } from '@/components/catalog/CatalogClient';

export default function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('catalog');

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-8 pb-20">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-2 mb-6 max-w-2xl text-pretty leading-relaxed text-muted">{t('subtitle')}</p>
        <CatalogClient />
      </main>
    </div>
  );
}
