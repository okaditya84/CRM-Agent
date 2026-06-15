'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { FormSchema } from '@/lib/schema/types';
import { SchemaForm } from '@/components/form/SchemaForm';
import { cn } from '@/lib/utils';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function NewLeadClient({ schema }: { schema: FormSchema }) {
  const t = useTranslations('leads');
  const tf = useTranslations('form');
  const locale = useLocale();

  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, unknown> | undefined>();
  const [usedAi, setUsedAi] = useState(false);

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  async function structureWithAi() {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await fetch('/api/leads/normalize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: aiText, locale }),
      });
      if (res.status === 503) {
        setAiMessage(t('ai.notConfigured'));
        return;
      }
      const data = (await res.json()) as { data?: Record<string, unknown> };
      if (data.data) {
        setValues({ ...data.data });
        setUsedAi(true);
        setAiMessage(t('ai.review'));
      }
    } catch {
      setAiMessage(t('ai.notConfigured'));
    } finally {
      setAiLoading(false);
    }
  }

  async function save(formValues: Record<string, unknown>) {
    setSaveState('saving');
    setSaveError(null);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: formValues, source: usedAi ? 'llm_normalized' : 'manual' }),
      });
      if (res.status === 201) {
        setSaveState('saved');
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setSaveError(body.error ?? 'error');
      setSaveState('error');
    } catch {
      setSaveError('error');
      setSaveState('error');
    }
  }

  function addAnother() {
    setValues(undefined);
    setUsedAi(false);
    setAiText('');
    setAiMessage(null);
    setSaveState('idle');
    setSaveError(null);
  }

  if (saveState === 'saved') {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-2xl text-success">
          ✓
        </div>
        <h2 className="mt-4 text-xl font-semibold">{t('savedTitle')}</h2>
        <p className="mt-2 text-muted">{t('nextStep')}</p>
        <button
          type="button"
          onClick={addAnother}
          className="mt-5 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          {t('addAnother')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface-2 p-5">
        <label htmlFor="ai-note" className="mb-2 block text-sm font-semibold">
          {t('ai.label')}
        </label>
        <textarea
          id="ai-note"
          rows={3}
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          placeholder={t('ai.placeholder')}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-primary"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={structureWithAi}
            disabled={aiLoading || !aiText.trim()}
            className="rounded-lg border border-primary bg-primary-soft px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
          >
            {aiLoading ? t('ai.loading') : t('ai.button')}
          </button>
          {aiMessage && <span className="text-sm text-muted">{aiMessage}</span>}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <SchemaForm
          schema={schema}
          locale={locale}
          values={values}
          submitting={saveState === 'saving'}
          onSubmit={save}
        />
        {saveState === 'error' && (
          <p className={cn('mt-3 text-sm text-danger')}>
            {saveError === 'validation_failed' ? tf('fixErrors') : saveError}
          </p>
        )}
      </section>
    </div>
  );
}
