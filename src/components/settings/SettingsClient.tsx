'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { buildWaLink } from '@/lib/whatsapp/wa-link';
import { cn } from '@/lib/utils';

interface EventState {
  eventMode: boolean;
  automationHalt: boolean;
}
interface Status {
  whatsapp: boolean;
  llm: boolean;
  sheets: boolean;
  mediaDurable: boolean;
}

export function SettingsClient() {
  const t = useTranslations('settings');

  const [event, setEvent] = useState<EventState>({ eventMode: false, automationHalt: false });
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  const [number, setNumber] = useState('');
  const [message, setMessage] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      const [e, s] = await Promise.all([
        fetch('/api/settings/event-mode').then((r) => r.json()),
        fetch('/api/settings/status').then((r) => r.json()),
      ]);
      setEvent({ eventMode: !!e.eventMode, automationHalt: !!e.automationHalt });
      setStatus(s as Status);
    })();
    setNumber(localStorage.getItem('wa_number') ?? '');
    setMessage(localStorage.getItem('wa_message') ?? '');
  }, []);

  useEffect(() => {
    const digits = number.replace(/\D/g, '');
    localStorage.setItem('wa_number', number);
    localStorage.setItem('wa_message', message);
    if (digits.length < 8) {
      setQr(null);
      setLink('');
      return;
    }
    const url = buildWaLink(number, message);
    setLink(url);
    void QRCode.toDataURL(url, { width: 240, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [number, message]);

  async function update(patch: Partial<EventState>) {
    setBusy(true);
    try {
      const res = await fetch('/api/settings/event-mode', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const next = (await res.json()) as EventState;
      setEvent({ eventMode: !!next.eventMode, automationHalt: !!next.automationHalt });
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const integrations = status
    ? ([
        ['whatsapp', status.whatsapp],
        ['llm', status.llm],
        ['sheets', status.sheets],
        ['media', status.mediaDurable],
      ] as const)
    : [];

  return (
    <div className="space-y-6">
      {/* Event Mode */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{t('eventMode.title')}</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{t('eventMode.desc')}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => update({ eventMode: !event.eventMode })}
            aria-pressed={event.eventMode}
            className={cn(
              'relative h-9 w-16 shrink-0 rounded-full transition-colors',
              event.eventMode ? 'bg-success' : 'bg-border',
            )}
          >
            <span
              className={cn(
                'absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all',
                event.eventMode ? 'left-8' : 'left-1',
              )}
            />
          </button>
        </div>
        <p className={cn('mt-4 text-sm font-medium', event.eventMode ? 'text-success' : 'text-muted')}>
          {event.eventMode ? t('eventMode.on') : t('eventMode.off')}
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm text-danger">
          <input
            type="checkbox"
            checked={event.automationHalt}
            disabled={busy}
            onChange={() => update({ automationHalt: !event.automationHalt })}
          />
          {t('eventMode.halt')}
        </label>
      </section>

      {/* QR generator */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t('qr.title')}</h2>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{t('qr.desc')}</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('qr.number')}</label>
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder={t('qr.numberHint')}
                inputMode="tel"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('qr.message')}</label>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 outline-none focus:border-primary"
              />
            </div>
            {link && (
              <button
                type="button"
                onClick={copyLink}
                className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-medium hover:bg-surface"
              >
                {copied ? t('qr.copied') : t('qr.copy')}
              </button>
            )}
          </div>
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface-2 p-4">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="WhatsApp QR" width={200} height={200} className="rounded" />
            ) : (
              <div className="flex h-[200px] w-[200px] items-center justify-center text-center text-xs text-muted">
                {t('qr.numberHint')}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Integration status */}
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('integrations.title')}</h2>
          <a
            href="https://github.com/okaditya84/CRM-Agent/blob/main/docs/SETUP.md"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t('integrations.guide')}
          </a>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {integrations.map(([key, ok]) => (
            <li key={key} className="flex items-center justify-between py-2.5">
              <span className="text-sm">{t(`integrations.${key}`)}</span>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium',
                  ok ? 'bg-primary-soft text-success' : 'bg-surface-2 text-muted',
                )}
              >
                {ok ? t('integrations.configured') : t('integrations.notConfigured')}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
