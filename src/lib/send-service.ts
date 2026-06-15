import type { Lead, StorageProvider } from './storage/types';
import type { MediaStore } from './media/types';
import type { WhatsAppProvider } from './whatsapp/provider';
import type { SendResult } from './whatsapp/types';

export interface SendPhotosArgs {
  whatsapp: WhatsAppProvider;
  media: MediaStore;
  storage: StorageProvider;
  lead: Lead;
  photoIds: string[];
  message?: string;
}

export interface PhotoSendResult {
  photoId: string;
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface SendPhotosResult {
  sent: number;
  failed: number;
  results: PhotoSendResult[];
  messageSent: boolean;
}

/** Meta wants the recipient as digits with country code (no '+'). */
function toRecipient(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Send selected catalog photos to a lead over WhatsApp. Each photo's bytes are
 * uploaded to WhatsApp (→ media id) then sent as an image, sequentially so they
 * arrive in order. Records the attempt as an interaction for team visibility.
 *
 * Note: this is a manual admin action, so it is NOT gated by Event Mode (which
 * gates the autonomous bot). If the 24h window is closed, Meta rejects the
 * free-form send and the per-photo error surfaces here.
 */
export async function sendPhotosToLead(args: SendPhotosArgs): Promise<SendPhotosResult> {
  const { whatsapp, media, storage, lead, photoIds } = args;
  const to = toRecipient(lead.phone);

  let messageSent = false;
  if (args.message && args.message.trim()) {
    const r: SendResult = await whatsapp.sendText(to, args.message.trim());
    messageSent = r.ok;
  }

  const catalog = await storage.listPhotos();
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const results: PhotoSendResult[] = [];

  for (const photoId of photoIds) {
    const photo = byId.get(photoId);
    if (!photo) {
      results.push({ photoId, ok: false, error: 'photo_not_found' });
      continue;
    }
    const bytes = await media.get(photo.storageKey);
    if (!bytes) {
      results.push({ photoId, ok: false, error: 'media_missing' });
      continue;
    }
    const upload = await whatsapp.uploadMedia(bytes.bytes, bytes.mime);
    if (!upload.ok || !upload.mediaId) {
      results.push({ photoId, ok: false, error: upload.error ?? 'upload_failed' });
      continue;
    }
    const sent = await whatsapp.sendImage(to, {
      kind: 'id',
      id: upload.mediaId,
      caption: photo.caption,
    });
    results.push(
      sent.ok
        ? { photoId, ok: true, providerMessageId: sent.providerMessageId }
        : { photoId, ok: false, error: sent.error },
    );
  }

  const sent = results.filter((r) => r.ok).length;
  await storage.addInteraction({
    leadId: lead.id,
    kind: 'whatsapp',
    body: `Sent ${sent}/${photoIds.length} photo(s)${messageSent ? ' + message' : ''} on WhatsApp`,
    authorId: null,
  });

  return { sent, failed: photoIds.length - sent, results, messageSent };
}
