import { newId } from './ids';
import { normalizePhone } from '../phone';
import type {
  BaseRecord,
  EntityId,
  Interaction,
  Lead,
  ListQuery,
  Page,
  Phone,
  PhotoMeta,
  Salesperson,
  Setting,
  SettingScope,
  StorageCapabilities,
  StorageProvider,
  UpsertLeadInput,
  WriteResult,
} from './types';

function now(): string {
  return new Date().toISOString();
}

function fresh(): Pick<BaseRecord, 'id' | 'createdAt' | 'updatedAt' | 'version'> {
  const ts = now();
  return { id: newId(), createdAt: ts, updatedAt: ts, version: 1 };
}

function paginate<T extends BaseRecord>(items: T[], query?: ListQuery): Page<T> {
  let result = items;
  if (query?.since) {
    const since = query.since;
    result = result.filter((r) => r.updatedAt >= since);
  }
  const limit = query?.limit ?? result.length;
  return { items: result.slice(0, limit), cursor: null };
}

/**
 * Reference StorageProvider backed by in-process maps. Used for local dev and
 * tests, and as the executable contract every other adapter must satisfy.
 * Operations are synchronous under the hood, so reads-modify-writes are atomic.
 */
export class InMemoryStorageProvider implements StorageProvider {
  private leads = new Map<EntityId, Lead>();
  private phoneIndex = new Map<Phone, EntityId>();
  private interactions: Interaction[] = [];
  private salespeople = new Map<EntityId, Salesperson>();
  private photos: PhotoMeta[] = [];
  private settings = new Map<string, Setting>();

  capabilities(): StorageCapabilities {
    return { realtime: false, transactional: true, serverGeneratedIds: false };
  }

  async getLead(id: EntityId): Promise<Lead | null> {
    return this.leads.get(id) ?? null;
  }

  async findLeadByPhone(phone: Phone): Promise<Lead | null> {
    const normalized = normalizePhone(phone) ?? phone;
    const id = this.phoneIndex.get(normalized);
    return id ? (this.leads.get(id) ?? null) : null;
  }

  async listLeads(query?: ListQuery): Promise<Page<Lead>> {
    const all = [...this.leads.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    return paginate(all, query);
  }

  async upsertLeadByPhone(input: UpsertLeadInput): Promise<WriteResult<Lead>> {
    const phone = normalizePhone(input.phone);
    if (!phone) {
      return { ok: false, reason: 'transport', error: 'invalid_phone' };
    }

    const existingId = this.phoneIndex.get(phone);
    if (existingId) {
      const existing = this.leads.get(existingId)!;
      if (
        input.expectedVersion !== undefined &&
        input.expectedVersion !== existing.version
      ) {
        return { ok: false, reason: 'version_conflict', current: existing };
      }
      const updated: Lead = {
        ...existing,
        // Merge field data so concurrent writers don't clobber unrelated fields.
        data: { ...existing.data, ...input.data, phone },
        salespersonId:
          input.salespersonId !== undefined
            ? input.salespersonId
            : existing.salespersonId,
        status: input.status ?? existing.status,
        source: input.source,
        updatedAt: now(),
        version: existing.version + 1,
      };
      this.leads.set(existingId, updated);
      return { ok: true, record: updated };
    }

    const lead: Lead = {
      ...fresh(),
      phone,
      data: { ...input.data, phone },
      salespersonId: input.salespersonId ?? null,
      source: input.source,
      status: input.status ?? 'new',
    };
    this.leads.set(lead.id, lead);
    this.phoneIndex.set(phone, lead.id);
    return { ok: true, record: lead };
  }

  async updateLead(
    id: EntityId,
    patch: Partial<Pick<Lead, 'data' | 'status' | 'salespersonId'>>,
    expectedVersion: number,
  ): Promise<WriteResult<Lead>> {
    const existing = this.leads.get(id);
    if (!existing) return { ok: false, reason: 'transport', error: 'not_found' };
    if (existing.version !== expectedVersion) {
      return { ok: false, reason: 'version_conflict', current: existing };
    }
    const updated: Lead = {
      ...existing,
      data: patch.data ? { ...existing.data, ...patch.data } : existing.data,
      status: patch.status ?? existing.status,
      salespersonId:
        patch.salespersonId !== undefined
          ? patch.salespersonId
          : existing.salespersonId,
      updatedAt: now(),
      version: existing.version + 1,
    };
    this.leads.set(id, updated);
    return { ok: true, record: updated };
  }

  async addInteraction(
    input: Omit<Interaction, keyof BaseRecord>,
  ): Promise<WriteResult<Interaction>> {
    const record: Interaction = { ...fresh(), ...input };
    this.interactions.push(record);
    return { ok: true, record };
  }

  async listInteractions(leadId: EntityId, query?: ListQuery): Promise<Page<Interaction>> {
    const items = this.interactions
      .filter((i) => i.leadId === leadId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return paginate(items, query);
  }

  async listSalespeople(): Promise<Salesperson[]> {
    return [...this.salespeople.values()];
  }

  async upsertSalesperson(
    input: Pick<Salesperson, 'phone'> & Partial<Omit<Salesperson, keyof BaseRecord>>,
  ): Promise<WriteResult<Salesperson>> {
    const phone = normalizePhone(input.phone);
    if (!phone) return { ok: false, reason: 'transport', error: 'invalid_phone' };
    const existing = [...this.salespeople.values()].find((s) => s.phone === phone);
    if (existing) {
      const updated: Salesperson = {
        ...existing,
        name: input.name ?? existing.name,
        active: input.active ?? existing.active,
        updatedAt: now(),
        version: existing.version + 1,
      };
      this.salespeople.set(existing.id, updated);
      return { ok: true, record: updated };
    }
    const record: Salesperson = {
      ...fresh(),
      phone,
      name: input.name ?? '',
      active: input.active ?? true,
    };
    this.salespeople.set(record.id, record);
    return { ok: true, record };
  }

  async listPhotos(): Promise<PhotoMeta[]> {
    return [...this.photos];
  }

  async addPhoto(input: Omit<PhotoMeta, keyof BaseRecord>): Promise<WriteResult<PhotoMeta>> {
    const record: PhotoMeta = { ...fresh(), ...input };
    this.photos.push(record);
    return { ok: true, record };
  }

  async getSetting(key: string): Promise<Setting | null> {
    return this.settings.get(key) ?? null;
  }

  async putSetting(
    key: string,
    value: unknown,
    scope: SettingScope,
  ): Promise<WriteResult<Setting>> {
    const existing = this.settings.get(key);
    const record: Setting = existing
      ? { ...existing, value, scope, updatedAt: now(), version: existing.version + 1 }
      : { ...fresh(), key, value, scope };
    this.settings.set(key, record);
    return { ok: true, record };
  }
}
