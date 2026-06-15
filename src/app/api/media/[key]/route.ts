import { getMediaStore } from '@/lib/runtime';

export const dynamic = 'force-dynamic';

/** Serve stored media bytes (thumbnails for the admin UI). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ key: string }> },
): Promise<Response> {
  const { key } = await ctx.params;
  const media = await getMediaStore().get(decodeURIComponent(key));
  if (!media) return new Response('not_found', { status: 404 });
  return new Response(media.bytes as BodyInit, {
    status: 200,
    headers: {
      'content-type': media.mime,
      'cache-control': 'public, max-age=3600',
    },
  });
}
