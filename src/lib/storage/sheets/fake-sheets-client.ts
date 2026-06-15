import type { SheetsClient } from './sheets-client';

interface FakeSheet {
  header: string[];
  rows: string[][];
}

/**
 * In-memory SheetsClient for tests and local development. Mirrors the row-number
 * semantics of the real API: row 1 is the header, data starts at row 2.
 */
export class FakeSheetsClient implements SheetsClient {
  private sheets = new Map<string, FakeSheet>();
  /** Observable call counter — lets tests assert on request volume (quota). */
  public calls = 0;

  private sheet(title: string): FakeSheet {
    let s = this.sheets.get(title);
    if (!s) {
      s = { header: [], rows: [] };
      this.sheets.set(title, s);
    }
    return s;
  }

  async ensureSheet(title: string): Promise<void> {
    this.calls++;
    this.sheet(title);
  }

  async getHeader(title: string): Promise<string[]> {
    this.calls++;
    return [...this.sheet(title).header];
  }

  async setHeader(title: string, header: string[]): Promise<void> {
    this.calls++;
    this.sheet(title).header = [...header];
  }

  async getAllRows(title: string): Promise<string[][]> {
    this.calls++;
    return this.sheet(title).rows.map((r) => [...r]);
  }

  async appendRow(title: string, row: string[]): Promise<{ rowNumber: number }> {
    this.calls++;
    const s = this.sheet(title);
    s.rows.push([...row]);
    return { rowNumber: s.rows.length + 1 }; // +1 header offset → 1-based sheet row
  }

  async updateRow(title: string, rowNumber: number, row: string[]): Promise<void> {
    this.calls++;
    const s = this.sheet(title);
    const index = rowNumber - 2; // row 2 → index 0
    if (index < 0 || index >= s.rows.length) {
      throw new Error(`updateRow: row ${rowNumber} out of range in "${title}"`);
    }
    s.rows[index] = [...row];
  }
}
