import type { WhatsAppProvider } from './provider';
import type { MediaRef, MediaUploadResult, SendResult } from './types';

/** Scripted WhatsAppProvider for tests — records every call, returns deterministic ids. */
export class FakeWhatsAppProvider implements WhatsAppProvider {
  public texts: Array<{ to: string; text: string }> = [];
  public images: Array<{ to: string; media: MediaRef }> = [];
  public uploads: Array<{ mime: string; size: number }> = [];
  public templates: Array<{ to: string; name: string }> = [];
  public reads: string[] = [];
  private n = 0;

  constructor(private readonly opts: { failUploads?: boolean; failSendFor?: (n: number) => boolean } = {}) {}

  async sendText(to: string, text: string): Promise<SendResult> {
    this.texts.push({ to, text });
    return { ok: true, providerMessageId: `wamid_text_${this.n++}` };
  }

  async sendImage(to: string, media: MediaRef): Promise<SendResult> {
    this.images.push({ to, media });
    const i = this.n++;
    if (this.opts.failSendFor?.(i)) return { ok: false, error: 'send_failed' };
    return { ok: true, providerMessageId: `wamid_img_${i}` };
  }

  async sendImagesSequential(to: string, medias: MediaRef[]): Promise<SendResult[]> {
    const results: SendResult[] = [];
    for (const media of medias) results.push(await this.sendImage(to, media));
    return results;
  }

  async sendTemplate(to: string, templateName: string): Promise<SendResult> {
    this.templates.push({ to, name: templateName });
    return { ok: true, providerMessageId: `wamid_tpl_${this.n++}` };
  }

  async uploadMedia(bytes: Uint8Array, mime: string): Promise<MediaUploadResult> {
    this.uploads.push({ mime, size: bytes.byteLength });
    if (this.opts.failUploads) return { ok: false, error: 'upload_failed' };
    return { ok: true, mediaId: `media_${this.n++}` };
  }

  async markRead(providerMessageId: string): Promise<void> {
    this.reads.push(providerMessageId);
  }
}
