import type { WhatsAppProvider } from '../provider';
import type { MediaRef, MediaUploadResult, SendResult } from '../types';

export interface MetaCloudConfig {
  accessToken: string;
  phoneNumberId: string;
  apiVersion?: string; // default 'v21.0'
  baseUrl?: string; // default 'https://graph.facebook.com'
  /** Injectable for testing; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

interface GraphSendResponse {
  messages?: Array<{ id?: string }>;
  error?: { message?: string; code?: number };
}
interface GraphMediaResponse {
  id?: string;
  error?: { message?: string };
}

/** Official Meta WhatsApp Cloud API implementation of WhatsAppProvider. */
export class MetaCloudAdapter implements WhatsAppProvider {
  private readonly token: string;
  private readonly phoneNumberId: string;
  private readonly apiVersion: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: MetaCloudConfig) {
    this.token = config.accessToken;
    this.phoneNumberId = config.phoneNumberId;
    this.apiVersion = config.apiVersion ?? 'v21.0';
    this.baseUrl = config.baseUrl ?? 'https://graph.facebook.com';
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private url(path: string): string {
    return `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/${path}`;
  }

  private async postMessage(payload: Record<string, unknown>): Promise<SendResult> {
    let res: Response;
    try {
      res = await this.fetchImpl(this.url('messages'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
      });
    } catch (err) {
      return { ok: false, error: String(err), retriable: true };
    }
    const json = (await res.json().catch(() => ({}))) as GraphSendResponse;
    if (!res.ok) {
      return {
        ok: false,
        error: json.error?.message ?? `HTTP ${res.status}`,
        code: json.error?.code,
        retriable: res.status >= 500,
      };
    }
    const id = json.messages?.[0]?.id;
    return id ? { ok: true, providerMessageId: id } : { ok: false, error: 'no_message_id' };
  }

  sendText(to: string, text: string): Promise<SendResult> {
    return this.postMessage({ to, type: 'text', text: { body: text, preview_url: false } });
  }

  sendImage(to: string, media: MediaRef): Promise<SendResult> {
    const image =
      media.kind === 'id'
        ? { id: media.id, caption: media.caption }
        : { link: media.url, caption: media.caption };
    return this.postMessage({ to, type: 'image', image });
  }

  async sendImagesSequential(to: string, medias: MediaRef[]): Promise<SendResult[]> {
    const results: SendResult[] = [];
    for (const media of medias) {
      // Await each so WhatsApp delivers them in order.
      results.push(await this.sendImage(to, media));
    }
    return results;
  }

  sendTemplate(
    to: string,
    templateName: string,
    language: string,
    variables: string[],
  ): Promise<SendResult> {
    const components =
      variables.length > 0
        ? [
            {
              type: 'body',
              parameters: variables.map((v) => ({ type: 'text', text: v })),
            },
          ]
        : [];
    return this.postMessage({
      to,
      type: 'template',
      template: { name: templateName, language: { code: language }, components },
    });
  }

  async uploadMedia(bytes: Uint8Array, mime: string): Promise<MediaUploadResult> {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('file', new Blob([bytes as BlobPart], { type: mime }));
    let res: Response;
    try {
      res = await this.fetchImpl(this.url('media'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` },
        body: form,
      });
    } catch (err) {
      return { ok: false, error: String(err) };
    }
    const json = (await res.json().catch(() => ({}))) as GraphMediaResponse;
    if (!res.ok || !json.id) {
      return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, mediaId: json.id };
  }

  async markRead(providerMessageId: string): Promise<void> {
    await this.postMessage({ status: 'read', message_id: providerMessageId }).catch(() => {});
  }
}
