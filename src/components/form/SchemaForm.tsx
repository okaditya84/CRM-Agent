'use client';

import { useEffect, useMemo } from 'react';
import {
  useForm,
  Controller,
  type FieldValues,
  type Resolver,
  type SubmitHandler,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import type { FieldDef, FormSchema } from '@/lib/schema/types';
import { compileZodSchema } from '@/lib/schema/compile-zod';
import { resolveI18n } from '@/lib/schema/i18n';
import { cn } from '@/lib/utils';

const INPUT_CLS =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-foreground outline-none transition-colors focus:border-primary';

function buildDefaults(
  schema: FormSchema,
  values?: Record<string, unknown>,
): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  for (const f of schema.fields) base[f.key] = f.type === 'multi_select' ? [] : '';
  return { ...base, ...(values ?? {}) };
}

export interface SchemaFormProps {
  schema: FormSchema;
  locale: string;
  /** Pre-fill values (e.g. from the AI normalizer). */
  values?: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
}

export function SchemaForm({ schema, locale, values, submitting, onSubmit }: SchemaFormProps) {
  const t = useTranslations('form');
  const zodSchema = useMemo(() => compileZodSchema(schema), [schema]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FieldValues>({
    resolver: zodResolver(zodSchema) as unknown as Resolver<FieldValues>,
    defaultValues: buildDefaults(schema, values),
  });

  // When the AI fills the form, reset to the new values.
  useEffect(() => {
    if (values) reset(buildDefaults(schema, values));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const submit: SubmitHandler<FieldValues> = (data) => onSubmit(data);

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
      {schema.fields.map((field) => {
        const error = errors[field.key]?.message;
        return (
          <div key={field.key}>
            <label htmlFor={field.key} className="mb-1.5 flex items-center gap-2 text-sm font-medium">
              {resolveI18n(field.label, locale)}
              {!field.required && (
                <span className="text-xs font-normal text-muted">{t('optional')}</span>
              )}
            </label>
            <FieldControl field={field} locale={locale} register={register} control={control} placeholder={t('selectPlaceholder')} />
            {typeof error === 'string' && (
              <p className="mt-1 text-sm text-danger">{error}</p>
            )}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {submitting ? t('saving') : t('save')}
      </button>
    </form>
  );
}

interface FieldControlProps {
  field: FieldDef;
  locale: string;
  // react-hook-form's register/control — typed loosely to keep the dynamic schema simple.
  register: ReturnType<typeof useForm<FieldValues>>['register'];
  control: ReturnType<typeof useForm<FieldValues>>['control'];
  placeholder: string;
}

function FieldControl({ field, locale, register, control, placeholder }: FieldControlProps) {
  const ph = field.placeholder ? resolveI18n(field.placeholder, locale) : undefined;

  switch (field.type) {
    case 'free_text':
      return <textarea id={field.key} rows={3} placeholder={ph} className={INPUT_CLS} {...register(field.key)} />;

    case 'number':
      return (
        <input
          id={field.key}
          type="number"
          placeholder={ph}
          className={INPUT_CLS}
          {...register(field.key, { valueAsNumber: true })}
        />
      );

    case 'single_select':
      return (
        <select id={field.key} className={INPUT_CLS} defaultValue="" {...register(field.key)}>
          <option value="" disabled>
            {placeholder}
          </option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {resolveI18n(o.label, locale)}
            </option>
          ))}
        </select>
      );

    case 'multi_select':
      return (
        <Controller
          control={control}
          name={field.key}
          render={({ field: { value, onChange } }) => {
            const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
            const toggle = (v: string) =>
              onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
            return (
              <div className="flex flex-wrap gap-2">
                {(field.options ?? []).map((o) => {
                  const active = selected.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggle(o.value)}
                      aria-pressed={active}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm transition-colors',
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-surface text-foreground hover:bg-surface-2',
                      )}
                    >
                      {resolveI18n(o.label, locale)}
                    </button>
                  );
                })}
              </div>
            );
          }}
        />
      );

    case 'email':
      return <input id={field.key} type="email" placeholder={ph} className={INPUT_CLS} {...register(field.key)} />;

    case 'phone':
      return <input id={field.key} type="tel" inputMode="tel" placeholder={ph} className={INPUT_CLS} {...register(field.key)} />;

    case 'text':
    default:
      return <input id={field.key} type="text" placeholder={ph} className={INPUT_CLS} {...register(field.key)} />;
  }
}
