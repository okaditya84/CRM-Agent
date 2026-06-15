import type { MediaRef, MediaUploadResult, SendResult } from './types';

/**
 * The modular WhatsApp surface. The Meta Cloud adapter is one implementation;
 * an unofficial adapter could implement the same methods (and no-op the
 * template methods, which only the official API supports).
 */
export interface WhatsAppProvider {
  sendText(to: string, text: string): Promise<SendResult>;
  sendImage(to: string, media: MediaRef): Promise<SendResult>;
  /** Sends images one-by-one, awaiting each, so they arrive in order. */
  sendImagesSequential(to: string, medias: MediaRef[]): Promise<SendResult[]>;
  sendTemplate(
    to: string,
    templateName: string,
    language: string,
    variables: string[],
  ): Promise<SendResult>;
  uploadMedia(bytes: Uint8Array, mime: string): Promise<MediaUploadResult>;
  markRead(providerMessageId: string): Promise<void>;
}
