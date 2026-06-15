import { getMediaStore, getStorage } from '@/lib/runtime';

export const dynamic = 'force-dynamic';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === 'string' ? v : '';
}

/** Upload a product photo: store bytes + create the catalog entry. */
export async function POST(req: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: 'expected_multipart' }, 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) return json({ error: 'missing_file' }, 400);
  const mime = file.type || 'application/octet-stream';
  if (!mime.startsWith('image/')) return json({ error: 'not_an_image' }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await getMediaStore().put(bytes, mime);

  const priceRaw = str(form.get('price')).trim();
  const price = priceRaw ? Number(priceRaw) : undefined;
  const tags = str(form.get('tags'))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const result = await getStorage().addPhoto({
    storageKey: stored.key,
    url: stored.url,
    mime,
    caption: str(form.get('caption')).trim() || undefined,
    sku: str(form.get('sku')).trim() || undefined,
    price: price !== undefined && Number.isFinite(price) ? price : undefined,
    tags,
  });

  return result.ok ? json({ ok: true, photo: result.record }, 201) : json({ error: 'save_failed' }, 500);
}

/** List catalog photos. */
export async function GET(): Promise<Response> {
  const photos = await getStorage().listPhotos();
  return json({ items: photos });
}
