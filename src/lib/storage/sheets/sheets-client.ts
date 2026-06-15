import { google, type sheets_v4 } from 'googleapis';
import { TokenBucket } from './rate-limit';

/**
 * Minimal port over the Sheets operations the adapter needs. Keeping this narrow
 * lets the adapter be unit-tested against an in-memory fake, while the real
 * implementation below talks to Google.
 */
export interface SheetsClient {
  /** Create the worksheet (tab) if it doesn't already exist. */
  ensureSheet(title: string): Promise<void>;
  /** Header row (row 1), or [] if empty. */
  getHeader(title: string): Promise<string[]>;
  setHeader(title: string, header: string[]): Promise<void>;
  /** All data rows (row 2..N) as raw string cells. */
  getAllRows(title: string): Promise<string[][]>;
  /** Append a row; returns its 1-based sheet row number. */
  appendRow(title: string, row: string[]): Promise<{ rowNumber: number }>;
  updateRow(title: string, rowNumber: number, row: string[]): Promise<void>;
}

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  [k: string]: unknown;
}

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function a1(title: string, rest: string): string {
  // Quote the title (handles spaces) and escape any single quotes.
  return `'${title.replace(/'/g, "''")}'!${rest}`;
}

/** Real Google Sheets client. Throttled by a token bucket to respect quotas. */
export class GoogleSheetsApiClient implements SheetsClient {
  private readonly sheets: sheets_v4.Sheets;

  constructor(
    credentials: ServiceAccountCredentials,
    private readonly spreadsheetId: string,
    private readonly bucket: TokenBucket = new TokenBucket(10, 1),
  ) {
    const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async ensureSheet(title: string): Promise<void> {
    await this.bucket.take();
    const meta = await this.sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
    const exists = meta.data.sheets?.some((s) => s.properties?.title === title);
    if (exists) return;
    await this.bucket.take();
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
  }

  async getHeader(title: string): Promise<string[]> {
    await this.bucket.take();
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: a1(title, '1:1'),
    });
    return (res.data.values?.[0] ?? []).map(String);
  }

  async setHeader(title: string, header: string[]): Promise<void> {
    await this.bucket.take();
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: a1(title, 'A1'),
      valueInputOption: 'RAW',
      requestBody: { values: [header] },
    });
  }

  async getAllRows(title: string): Promise<string[][]> {
    await this.bucket.take();
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: a1(title, 'A2:ZZ'),
    });
    return (res.data.values ?? []).map((row) => row.map((c) => (c == null ? '' : String(c))));
  }

  async appendRow(title: string, row: string[]): Promise<{ rowNumber: number }> {
    await this.bucket.take();
    const res = await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: a1(title, 'A1'),
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });
    const updatedRange = res.data.updates?.updatedRange ?? '';
    const match = updatedRange.match(/![A-Z]+(\d+)/);
    const rowNumber = match ? Number(match[1]) : 0;
    return { rowNumber };
  }

  async updateRow(title: string, rowNumber: number, row: string[]): Promise<void> {
    await this.bucket.take();
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: a1(title, `A${rowNumber}`),
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });
  }
}
