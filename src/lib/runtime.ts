import type { FormSchema } from './schema/types';
import { defaultLeadSchema } from './schema/default-lead-schema';
import type { StorageProvider } from './storage/types';
import { InMemoryStorageProvider } from './storage/in-memory-adapter';
import { GoogleSheetsAdapter } from './storage/sheets/google-sheets-adapter';
import {
  GoogleSheetsApiClient,
  type ServiceAccountCredentials,
} from './storage/sheets/sheets-client';
import { createLlmProvider } from './llm/factory';
import type { LlmProvider, LlmProviderKind } from './llm/types';
import type { MediaStore } from './media/types';
import { LocalMediaStore } from './media/local';
import { R2MediaStore } from './media/r2';
import type { WhatsAppProvider } from './whatsapp/provider';
import { MetaCloudAdapter } from './whatsapp/cloud/meta-cloud-adapter';

/**
 * Runtime wiring. Resolves the active storage, LLM, and field schema from
 * configuration, falling back to an in-memory store so the app runs locally with
 * no credentials. Test setters allow injecting fakes. Once the encrypted settings
 * page exists, these readers will prefer settings over env.
 */

let _storage: StorageProvider | null = null;
let _llm: LlmProvider | null | undefined; // undefined = not yet resolved
let _schema: FormSchema | null = null;
let _media: MediaStore | null = null;
let _whatsapp: WhatsAppProvider | null | undefined;

function defaultModelFor(provider: LlmProviderKind): string {
  switch (provider) {
    case 'gemini':
      return 'gemini-2.5-flash';
    case 'anthropic':
      return 'claude-haiku-4-5';
    case 'openai_compatible':
      return 'gpt-4o-mini';
  }
}

export function getActiveSchema(): FormSchema {
  return _schema ?? defaultLeadSchema;
}

function buildStorageFromEnv(): StorageProvider {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (saJson && sheetId) {
    try {
      const creds = JSON.parse(saJson) as ServiceAccountCredentials;
      return new GoogleSheetsAdapter(new GoogleSheetsApiClient(creds, sheetId), getActiveSchema());
    } catch {
      // Fall back to in-memory if the credentials JSON is malformed.
    }
  }
  return new InMemoryStorageProvider();
}

function buildLlmFromEnv(): LlmProvider | null {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;
  const provider = (process.env.LLM_PROVIDER as LlmProviderKind) || 'gemini';
  return createLlmProvider({
    provider,
    apiKey,
    model: process.env.LLM_MODEL || defaultModelFor(provider),
    baseUrl: process.env.LLM_BASE_URL,
    thinking: process.env.LLM_THINKING === 'true',
  });
}

function buildMediaFromEnv(): MediaStore {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (accountId && bucket && accessKeyId && secretAccessKey) {
    return new R2MediaStore({
      accountId,
      bucket,
      accessKeyId,
      secretAccessKey,
      publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
    });
  }
  return new LocalMediaStore();
}

export function getStorage(): StorageProvider {
  if (!_storage) _storage = buildStorageFromEnv();
  return _storage;
}

export function getMediaStore(): MediaStore {
  if (!_media) _media = buildMediaFromEnv();
  return _media;
}

function buildWhatsAppFromEnv(): WhatsAppProvider | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) return null;
  return new MetaCloudAdapter({ accessToken, phoneNumberId });
}

export function getWhatsApp(): WhatsAppProvider | null {
  if (_whatsapp === undefined) _whatsapp = buildWhatsAppFromEnv();
  return _whatsapp;
}

export function getLlmProvider(): LlmProvider | null {
  if (_llm === undefined) _llm = buildLlmFromEnv();
  return _llm;
}

// --- test / settings injection ---------------------------------------------
export function setStorage(s: StorageProvider | null): void {
  _storage = s;
}
export function setLlmProvider(p: LlmProvider | null): void {
  _llm = p;
}
export function setActiveSchema(s: FormSchema | null): void {
  _schema = s;
}
export function setMediaStore(m: MediaStore | null): void {
  _media = m;
}
export function setWhatsApp(w: WhatsAppProvider | null): void {
  _whatsapp = w;
}
