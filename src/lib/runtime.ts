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

/**
 * Runtime wiring. Resolves the active storage, LLM, and field schema from
 * configuration, falling back to an in-memory store so the app runs locally with
 * no credentials. Test setters allow injecting fakes. Once the encrypted settings
 * page exists, these readers will prefer settings over env.
 */

let _storage: StorageProvider | null = null;
let _llm: LlmProvider | null | undefined; // undefined = not yet resolved
let _schema: FormSchema | null = null;

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

export function getStorage(): StorageProvider {
  if (!_storage) _storage = buildStorageFromEnv();
  return _storage;
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
