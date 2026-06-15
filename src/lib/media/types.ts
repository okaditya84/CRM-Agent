/**
 * Object storage for product photos. Photos are sent to WhatsApp by uploading
 * the bytes (→ media id), so a public URL is NOT required for delivery — it's
 * only used for thumbnails in the admin UI.
 */
export interface StoredMedia {
  key: string;
  /** URL the admin UI uses for thumbnails (may be app-served). */
  url: string;
  mime: string;
  size: number;
}

export interface MediaBytes {
  bytes: Uint8Array;
  mime: string;
}

export interface MediaStore {
  put(bytes: Uint8Array, mime: string): Promise<StoredMedia>;
  /** Fetch raw bytes (for serving thumbnails and for uploading to WhatsApp). */
  get(key: string): Promise<MediaBytes | null>;
  /** URL for the admin UI. */
  publicUrl(key: string): string;
  capabilities(): { durable: boolean };
}

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function extForMime(mime: string): string {
  return MIME_EXT[mime.toLowerCase()] ?? 'bin';
}
