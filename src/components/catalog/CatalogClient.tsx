'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface Photo {
  id: string;
  url: string;
  caption?: string;
  price?: number;
  tags: string[];
}

export function CatalogClient() {
  const t = useTranslations('catalog');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const res = await fetch('/api/photos');
    const data = (await res.json()) as { items?: Photo[] };
    setPhotos(data.items ?? []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (caption) fd.append('caption', caption);
      if (tags) fd.append('tags', tags);
      const res = await fetch('/api/photos', { method: 'POST', body: fd });
      if (res.ok) {
        setCaption('');
        setTags('');
        if (fileRef.current) fileRef.current.value = '';
        await refresh();
      }
    } finally {
      setUploading(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const inputCls =
    'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-primary';

  return (
    <div className="space-y-6">
      <form onSubmit={onUpload} className="rounded-xl border border-border bg-surface-2 p-5">
        <label className="mb-2 block text-sm font-semibold">{t('uploadLabel')}</label>
        <input ref={fileRef} type="file" accept="image/*" className="mb-3 block text-sm" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t('caption')}
            className={inputCls}
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t('tags')}
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {uploading ? t('uploading') : t('upload')}
        </button>
      </form>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-primary bg-primary-soft px-4 py-3">
          <span className="font-medium text-primary">{t('selected', { count: selected.size })}</span>
          <span className="text-sm text-muted">{t('sendSoon')}</span>
        </div>
      )}

      {photos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-muted">
          {t('empty')}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => {
            const active = selected.has(photo.id);
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => toggle(photo.id)}
                aria-pressed={active}
                className={cn(
                  'group relative overflow-hidden rounded-xl border bg-surface text-left transition-all',
                  active ? 'border-primary ring-2 ring-ring' : 'border-border hover:border-muted',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption ?? ''} className="aspect-square w-full object-cover" />
                {active && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
                    ✓
                  </span>
                )}
                {photo.caption && (
                  <span className="block truncate px-2 py-1.5 text-xs text-muted">{photo.caption}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
