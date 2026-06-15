import type { FormSchema } from '../../schema/types';
import { newId } from '../ids';
import { normalizePhone } from '../../phone';
import type {
  BaseRecord,
  EntityId,
  Interaction,
  Lead,
  ListQuery,
  Page,
  PhotoMeta,
  Salesperson,
  Setting,
  SettingScope,
  StorageCapabilities,
  StorageProvider,
  UpsertLeadInput,
  WriteResult,
} from '../types';
import type { SheetsClient } from './sheets-client';
import {
  type ColumnSpec,
  leadColumnSpecs,
  leadToCells,
  recordToCells,
  rowToLead,
  rowToRecord,
  zipRow,
} from './column-spec';
import {
  INTERACTION_SPECS,
  PHOTO_SPECS,
  SALESPERSON_SPECS,
  SETTING_SPECS,
  SHEET_TITLES,
} from './entity-specs';

function nowIso(): string {
  return new Date().toISOString();
}

function freshBase(): Pick<BaseRecord, 'id' | 'createdAt' | 'updatedAt' | 'version'> {
  const ts = nowIso();
  return { id: newId(), createdAt: ts, updatedAt: ts, version: 1 };
}

/**
 * StorageProvider backed by Google Sheets. Row mapping is header-driven (by
 * column name, not position), so adding a schema field appends a column at the
 * end without misaligning existing rows.
 *
 * Honest limitation: Sheets has no transactions, so optimistic concurrency here
 * is best-effort (load → check version → write). Adequate for a single admin and
 * a few salespeople; switch to the Supabase adapter for true atomicity at scale.
 */
export class GoogleSheetsAdapter implements StorageProvider {
  private headerCache = new Map<string, string[]>();

  constructor(
    private readonly client: SheetsClient,
    private readonly schema: FormSchema,
  ) {}

  capabilities(): StorageCapabilities {
    return { realtime: false, transactional: false, serverGeneratedIds: false };
  }

  // --- header readiness -----------------------------------------------------

  private async ensureReady(title: string, specs: ColumnSpec[]): Promise<string[]> {
    const cached = this.headerCache.get(title);
    if (cached) return cached;

    await this.client.ensureSheet(title);
    const existing = await this.client.getHeader(title);
    const desired = specs.map((s) => s.key);

    let header: string[];
    if (existing.length === 0) {
      await this.client.setHeader(title, desired);
      header = desired;
    } else {
      const missing = desired.filter((k) => !existing.includes(k));
      if (missing.length > 0) {
        header = [...existing, ...missing];
        await this.client.setHeader(title, header);
      } else {
        header = existing;
      }
    }
    this.headerCache.set(title, header);
    return header;
  }

  private alignRow(cells: Record<string, string>, header: string[]): string[] {
    return header.map((h) => cells[h] ?? '');
  }

  // --- leads ----------------------------------------------------------------

  private async loadLeads(): Promise<Array<{ lead: Lead; rowNumber: number }>> {
    const specs = leadColumnSpecs(this.schema);
    const header = await this.ensureReady(SHEET_TITLES.leads, specs);
    const rows = await this.client.getAllRows(SHEET_TITLES.leads);
    return rows
      .map((row, i) => ({
        lead: rowToLead(zipRow(header, row), this.schema, specs),
        rowNumber: i + 2,
      }))
      .filter((x) => x.lead.id !== '');
  }

  async getLead(id: EntityId): Promise<Lead | null> {
    const all = await this.loadLeads();
    return all.find((x) => x.lead.id === id)?.lead ?? null;
  }

  async findLeadByPhone(phone: string): Promise<Lead | null> {
    const normalized = normalizePhone(phone) ?? phone;
    const all = await this.loadLeads();
    return all.find((x) => x.lead.phone === normalized)?.lead ?? null;
  }

  async listLeads(query?: ListQuery): Promise<Page<Lead>> {
    const all = await this.loadLeads();
    let items = all.map((x) => x.lead).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (query?.since) items = items.filter((l) => l.updatedAt >= query.since!);
    if (query?.limit) items = items.slice(0, query.limit);
    return { items, cursor: null };
  }

  async upsertLeadByPhone(input: UpsertLeadInput): Promise<WriteResult<Lead>> {
    const phone = normalizePhone(input.phone);
    if (!phone) return { ok: false, reason: 'transport', error: 'invalid_phone' };

    try {
      const specs = leadColumnSpecs(this.schema);
      const header = await this.ensureReady(SHEET_TITLES.leads, specs);
      const all = await this.loadLeads();
      const match = all.find((x) => x.lead.phone === phone);

      if (match) {
        if (
          input.expectedVersion !== undefined &&
          input.expectedVersion !== match.lead.version
        ) {
          return { ok: false, reason: 'version_conflict', current: match.lead };
        }
        const updated: Lead = {
          ...match.lead,
          data: { ...match.lead.data, ...input.data, phone },
          salespersonId:
            input.salespersonId !== undefined
              ? input.salespersonId
              : match.lead.salespersonId,
          status: input.status ?? match.lead.status,
          source: input.source,
          updatedAt: nowIso(),
          version: match.lead.version + 1,
        };
        await this.client.updateRow(
          SHEET_TITLES.leads,
          match.rowNumber,
          this.alignRow(leadToCells(updated, specs), header),
        );
        return { ok: true, record: updated };
      }

      const lead: Lead = {
        ...freshBase(),
        phone,
        data: { ...input.data, phone },
        salespersonId: input.salespersonId ?? null,
        source: input.source,
        status: input.status ?? 'new',
      };
      await this.client.appendRow(
        SHEET_TITLES.leads,
        this.alignRow(leadToCells(lead, specs), header),
      );
      return { ok: true, record: lead };
    } catch (err) {
      return { ok: false, reason: 'transport', error: String(err) };
    }
  }

  async updateLead(
    id: EntityId,
    patch: Partial<Pick<Lead, 'data' | 'status' | 'salespersonId'>>,
    expectedVersion: number,
  ): Promise<WriteResult<Lead>> {
    try {
      const specs = leadColumnSpecs(this.schema);
      const header = await this.ensureReady(SHEET_TITLES.leads, specs);
      const all = await this.loadLeads();
      const match = all.find((x) => x.lead.id === id);
      if (!match) return { ok: false, reason: 'transport', error: 'not_found' };
      if (match.lead.version !== expectedVersion) {
        return { ok: false, reason: 'version_conflict', current: match.lead };
      }
      const updated: Lead = {
        ...match.lead,
        data: patch.data ? { ...match.lead.data, ...patch.data } : match.lead.data,
        status: patch.status ?? match.lead.status,
        salespersonId:
          patch.salespersonId !== undefined ? patch.salespersonId : match.lead.salespersonId,
        updatedAt: nowIso(),
        version: match.lead.version + 1,
      };
      await this.client.updateRow(
        SHEET_TITLES.leads,
        match.rowNumber,
        this.alignRow(leadToCells(updated, specs), header),
      );
      return { ok: true, record: updated };
    } catch (err) {
      return { ok: false, reason: 'transport', error: String(err) };
    }
  }

  // --- generic flat-record helpers (interactions / settings / etc.) ---------

  private async loadRecords(
    title: string,
    specs: ColumnSpec[],
  ): Promise<Array<{ record: Record<string, unknown>; rowNumber: number }>> {
    const header = await this.ensureReady(title, specs);
    const rows = await this.client.getAllRows(title);
    return rows
      .map((row, i) => ({ record: rowToRecord(zipRow(header, row), specs), rowNumber: i + 2 }))
      .filter((x) => typeof x.record.id === 'string' && x.record.id !== '');
  }

  private async appendRecord(
    title: string,
    specs: ColumnSpec[],
    record: object,
  ): Promise<void> {
    const header = await this.ensureReady(title, specs);
    await this.client.appendRow(title, this.alignRow(recordToCells(record, specs), header));
  }

  // --- interactions ---------------------------------------------------------

  async addInteraction(
    input: Omit<Interaction, keyof BaseRecord>,
  ): Promise<WriteResult<Interaction>> {
    try {
      const record: Interaction = { ...freshBase(), ...input };
      await this.appendRecord(SHEET_TITLES.interactions, INTERACTION_SPECS, {
        ...record,
        authorId: record.authorId ?? '',
      });
      return { ok: true, record };
    } catch (err) {
      return { ok: false, reason: 'transport', error: String(err) };
    }
  }

  async listInteractions(leadId: EntityId, query?: ListQuery): Promise<Page<Interaction>> {
    const records = await this.loadRecords(SHEET_TITLES.interactions, INTERACTION_SPECS);
    let items = records
      .map((x) => x.record as unknown as Interaction)
      .map((i) => ({ ...i, authorId: i.authorId ? i.authorId : null }))
      .filter((i) => i.leadId === leadId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (query?.limit) items = items.slice(0, query.limit);
    return { items, cursor: null };
  }

  // --- salespeople ----------------------------------------------------------

  async listSalespeople(): Promise<Salesperson[]> {
    const records = await this.loadRecords(SHEET_TITLES.salespeople, SALESPERSON_SPECS);
    return records.map((x) => x.record as unknown as Salesperson);
  }

  async upsertSalesperson(
    input: Pick<Salesperson, 'phone'> & Partial<Omit<Salesperson, keyof BaseRecord>>,
  ): Promise<WriteResult<Salesperson>> {
    const phone = normalizePhone(input.phone);
    if (!phone) return { ok: false, reason: 'transport', error: 'invalid_phone' };
    try {
      const header = await this.ensureReady(SHEET_TITLES.salespeople, SALESPERSON_SPECS);
      const records = await this.loadRecords(SHEET_TITLES.salespeople, SALESPERSON_SPECS);
      const match = records.find((x) => (x.record as unknown as Salesperson).phone === phone);
      if (match) {
        const current = match.record as unknown as Salesperson;
        const updated: Salesperson = {
          ...current,
          name: input.name ?? current.name,
          active: input.active ?? current.active,
          updatedAt: nowIso(),
          version: current.version + 1,
        };
        await this.client.updateRow(
          SHEET_TITLES.salespeople,
          match.rowNumber,
          this.alignRow(recordToCells(updated, SALESPERSON_SPECS), header),
        );
        return { ok: true, record: updated };
      }
      const record: Salesperson = {
        ...freshBase(),
        phone,
        name: input.name ?? '',
        active: input.active ?? true,
      };
      await this.appendRecord(SHEET_TITLES.salespeople, SALESPERSON_SPECS, record);
      return { ok: true, record };
    } catch (err) {
      return { ok: false, reason: 'transport', error: String(err) };
    }
  }

  // --- photos ---------------------------------------------------------------

  async listPhotos(): Promise<PhotoMeta[]> {
    const records = await this.loadRecords(SHEET_TITLES.photos, PHOTO_SPECS);
    return records.map((x) => {
      const r = x.record as unknown as PhotoMeta;
      return { ...r, tags: Array.isArray(r.tags) ? r.tags : [] };
    });
  }

  async addPhoto(input: Omit<PhotoMeta, keyof BaseRecord>): Promise<WriteResult<PhotoMeta>> {
    try {
      const record: PhotoMeta = { ...freshBase(), ...input };
      await this.appendRecord(SHEET_TITLES.photos, PHOTO_SPECS, record);
      return { ok: true, record };
    } catch (err) {
      return { ok: false, reason: 'transport', error: String(err) };
    }
  }

  // --- settings -------------------------------------------------------------

  async getSetting(key: string): Promise<Setting | null> {
    const records = await this.loadRecords(SHEET_TITLES.settings, SETTING_SPECS);
    const found = records.find((x) => (x.record as unknown as Setting).key === key);
    return found ? (found.record as unknown as Setting) : null;
  }

  async putSetting(
    key: string,
    value: unknown,
    scope: SettingScope,
  ): Promise<WriteResult<Setting>> {
    try {
      const header = await this.ensureReady(SHEET_TITLES.settings, SETTING_SPECS);
      const records = await this.loadRecords(SHEET_TITLES.settings, SETTING_SPECS);
      const match = records.find((x) => (x.record as unknown as Setting).key === key);
      if (match) {
        const current = match.record as unknown as Setting;
        const updated: Setting = {
          ...current,
          value,
          scope,
          updatedAt: nowIso(),
          version: current.version + 1,
        };
        await this.client.updateRow(
          SHEET_TITLES.settings,
          match.rowNumber,
          this.alignRow(recordToCells(updated, SETTING_SPECS), header),
        );
        return { ok: true, record: updated };
      }
      const record: Setting = { ...freshBase(), key, value, scope };
      await this.appendRecord(SHEET_TITLES.settings, SETTING_SPECS, record);
      return { ok: true, record };
    } catch (err) {
      return { ok: false, reason: 'transport', error: String(err) };
    }
  }
}
