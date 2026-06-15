'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface Photo {
  id: string;
  url: string;
  caption?: string;
}

type SendState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'done'; sent: number; total: number }
  | { kind: 'not_configured' }
  | { kind: 'error' };

export function SendPanel({ leadId }: { leadId: string }) {
  const t = useTranslations('send');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [state, setState] = useState<SendState>({ kind: 'idle' });

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/photos');
      const data = (await res.json()) as { items?: Photo[] };
      setPhotos(data.items ?? []);
    })();
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function send() {
    if (selected.size === 0 && !message.trim()) return;
    setState({ kind: 'sending' });
    try {
      const res = await fetch(`/api/leads/${leadId}/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ photoIds: [...selected], message: message.trim() || undefined }),
      });
      if (res.status === 503) {
        setState({ kind: 'not_configured' });
        return;
      }
      if (!res.ok) {
        setState({ kind: 'error' });
        return;
      }
      const body = (await res.json()) as { sent: number };
      setState({ kind: 'done', sent: body.sent, total: selected.size });
    } catch {
      setState({ kind: 'error' });
    }
  }

  return (
    <div className="mt-6 border-t border-border pt-6 text-left">
      <h3 className="text-lg font-semibold">{t('title')}</h3>

      {photos.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{t('noPhotos')}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">{t('selectHint')}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => {
              const active = selected.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={active}
                  className={cn(
                    'relative overflow-hidden rounded-lg border',
                    active ? 'border-primary ring-2 ring-ring' : 'border-border',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.caption ?? ''} className="aspect-square w-full object-cover" />
                  {active && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t('message')}
        rows={2}
        className="mt-4 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-primary"
      />

      <button
        type="button"
        onClick={send}
        disabled={state.kind === 'sending' || (selected.size === 0 && !message.trim())}
        className="mt-3 w-full rounded-xl bg-[#25D366] px-5 py-3 font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {state.kind === 'sending' ? t('sending') : t('button')}
      </button>

      {state.kind === 'done' && (
        <p className="mt-3 text-sm font-medium text-success">
          {t('result', { sent: state.sent, total: state.total })}
        </p>
      )}
      {state.kind === 'not_configured' && (
        <p className="mt-3 text-sm text-muted">{t('notConfigured')}</p>
      )}
      {state.kind === 'error' && <p className="mt-3 text-sm text-danger">{t('windowNote')}</p>}

      <p className="mt-3 text-xs leading-relaxed text-muted">{t('windowNote')}</p>
    </div>
  );
}
