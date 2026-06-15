import { newId } from '../storage/ids';
import { extForMime, type MediaBytes, type MediaStore, type StoredMedia } from './types';

/**
 * In-process media store for local dev. Bytes live in memory and are served via
 * /api/media/:key. Not durable across restarts or Worker isolates — production
 * uses the R2 store. The admin URL is relative so it works without a base URL.
 */
export class LocalMediaStore implements MediaStore {
  private items = new Map<string, MediaBytes>();

  async put(bytes: Uint8Array, mime: string): Promise<StoredMedia> {
    const key = `${newId()}.${extForMime(mime)}`;
    this.items.set(key, { bytes, mime });
    return { key, url: this.publicUrl(key), mime, size: bytes.byteLength };
  }

  async get(key: string): Promise<MediaBytes | null> {
    return this.items.get(key) ?? null;
  }

  publicUrl(key: string): string {
    return `/api/media/${encodeURIComponent(key)}`;
  }

  capabilities() {
    return { durable: false };
  }
}
