import { AwsClient } from 'aws4fetch';
import { newId } from '../storage/ids';
import { extForMime, type MediaBytes, type MediaStore, type StoredMedia } from './types';

export interface R2Config {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Public bucket / custom-domain base URL for direct thumbnails (optional). */
  publicBaseUrl?: string;
}

/**
 * Cloudflare R2 via its S3-compatible API (SigV4 through aws4fetch — Workers-safe).
 * Durable and zero-egress; the production media store.
 */
export class R2MediaStore implements MediaStore {
  private readonly client: AwsClient;
  private readonly endpoint: string;

  constructor(private readonly cfg: R2Config) {
    this.client = new AwsClient({
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
      region: 'auto',
      service: 's3',
    });
    this.endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}`;
  }

  async put(bytes: Uint8Array, mime: string): Promise<StoredMedia> {
    const key = `${newId()}.${extForMime(mime)}`;
    const res = await this.client.fetch(`${this.endpoint}/${key}`, {
      method: 'PUT',
      headers: { 'content-type': mime },
      body: bytes as BodyInit,
    });
    if (!res.ok) throw new Error(`r2_put_failed ${res.status}`);
    return { key, url: this.publicUrl(key), mime, size: bytes.byteLength };
  }

  async get(key: string): Promise<MediaBytes | null> {
    const res = await this.client.fetch(`${this.endpoint}/${encodeURIComponent(key)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`r2_get_failed ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { bytes, mime: res.headers.get('content-type') ?? 'application/octet-stream' };
  }

  publicUrl(key: string): string {
    return this.cfg.publicBaseUrl
      ? `${this.cfg.publicBaseUrl.replace(/\/$/, '')}/${key}`
      : `/api/media/${encodeURIComponent(key)}`;
  }

  capabilities() {
    return { durable: true };
  }
}
