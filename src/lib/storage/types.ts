/**
 * Backend-agnostic storage contract. The app depends only on this interface;
 * concrete adapters (in-memory, Google Sheets now, Supabase later) are swapped
 * by configuration with no changes to callers.
 *
 * Two rules keep the abstraction swap-safe:
 *   1. The APP generates ids (ULIDs) — never the store.
 *   2. `upsertLeadByPhone` is first-class, so idempotency/dedup is the contract.
 */

export type EntityId = string; // ULID
export type ISO8601 = string;
export type Phone = string; // normalized E.164, e.g. "+919812345678"

export interface BaseRecord {
  id: EntityId;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  /** Optimistic-concurrency token; bumped on every write. */
  version: number;
}

export type LeadData = Record<string, unknown>;
export type LeadSource = 'manual' | 'llm_normalized' | 'whatsapp_bot';

export interface Lead extends BaseRecord {
  phone: Phone; // natural dedup key (mirrors data.phone)
  data: LeadData; // shaped by the field schema
  salespersonId: EntityId | null;
  source: LeadSource;
  status: string;
}

export type InteractionKind =
  | 'note'
  | 'call'
  | 'whatsapp'
  | 'meeting'
  | 'status_change';

export interface Interaction extends BaseRecord {
  leadId: EntityId;
  kind: InteractionKind;
  body: string;
  authorId: EntityId | null;
}

/** A product photo in the catalog (selected per-send, not owned by a lead). */
export interface PhotoMeta extends BaseRecord {
  storageKey: string; // object-storage path/key
  url: string; // public URL passed to WhatsApp
  mime: string;
  caption?: string;
  sku?: string;
  price?: number;
  tags: string[];
}

export interface Salesperson extends BaseRecord {
  name: string;
  phone: Phone;
  active: boolean;
}

export type SettingScope = 'global' | 'template' | 'schema';

export interface Setting extends BaseRecord {
  key: string;
  value: unknown;
  scope: SettingScope;
}

export interface ListQuery {
  filter?: Record<string, unknown>;
  /** Delta polling: only records updated at/after this timestamp. */
  since?: ISO8601;
  limit?: number;
  cursor?: string;
}

export interface Page<T> {
  items: T[];
  cursor: string | null;
}

/** Discriminated write outcome so the UI can react precisely. */
export type WriteResult<T> =
  | { ok: true; record: T }
  | { ok: false; reason: 'version_conflict'; current: T }
  | { ok: false; reason: 'rate_limited'; retryAfterMs: number }
  | { ok: false; reason: 'transport'; error: string };

export interface UpsertLeadInput {
  phone: Phone;
  data: LeadData;
  salespersonId?: EntityId | null;
  source: LeadSource;
  status?: string;
  /** When provided, the upsert fails with `version_conflict` if it doesn't match. */
  expectedVersion?: number;
}

export interface StorageCapabilities {
  /** Push updates available (vs. polling). */
  realtime: boolean;
  /** True atomic read-modify-write (vs. best-effort). */
  transactional: boolean;
  /** The store mints ids itself (we never rely on this). */
  serverGeneratedIds: boolean;
}

export interface StorageProvider {
  // Leads
  getLead(id: EntityId): Promise<Lead | null>;
  findLeadByPhone(phone: Phone): Promise<Lead | null>;
  listLeads(query?: ListQuery): Promise<Page<Lead>>;
  upsertLeadByPhone(input: UpsertLeadInput): Promise<WriteResult<Lead>>;
  updateLead(
    id: EntityId,
    patch: Partial<Pick<Lead, 'data' | 'status' | 'salespersonId'>>,
    expectedVersion: number,
  ): Promise<WriteResult<Lead>>;

  // Interactions (append-only)
  addInteraction(
    input: Omit<Interaction, keyof BaseRecord>,
  ): Promise<WriteResult<Interaction>>;
  listInteractions(leadId: EntityId, query?: ListQuery): Promise<Page<Interaction>>;

  // Salespeople
  listSalespeople(): Promise<Salesperson[]>;
  upsertSalesperson(
    input: Pick<Salesperson, 'phone'> & Partial<Omit<Salesperson, keyof BaseRecord>>,
  ): Promise<WriteResult<Salesperson>>;

  // Photos (catalog)
  listPhotos(): Promise<PhotoMeta[]>;
  addPhoto(input: Omit<PhotoMeta, keyof BaseRecord>): Promise<WriteResult<PhotoMeta>>;

  // Settings
  getSetting(key: string): Promise<Setting | null>;
  putSetting(
    key: string,
    value: unknown,
    scope: SettingScope,
  ): Promise<WriteResult<Setting>>;

  capabilities(): StorageCapabilities;
}
