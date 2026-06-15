import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

/** App header with brand, primary nav, and the language switcher. */
export function AppHeader() {
  const t = useTranslations('nav');
  const tApp = useTranslations('app');
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              स
            </span>
            <span className="font-semibold tracking-tight">{tApp('name')}</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/leads/new" className="rounded-md px-2.5 py-1.5 text-muted hover:bg-surface-2 hover:text-foreground">
              {t('leads')}
            </Link>
            <Link href="/catalog" className="rounded-md px-2.5 py-1.5 text-muted hover:bg-surface-2 hover:text-foreground">
              {t('catalog')}
            </Link>
            <Link href="/settings" className="rounded-md px-2.5 py-1.5 text-muted hover:bg-surface-2 hover:text-foreground">
              {t('settings')}
            </Link>
          </nav>
        </div>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
