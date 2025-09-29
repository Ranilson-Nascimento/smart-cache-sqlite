// React Native adapter for react-native-quick-sqlite
// Dynamically imports the library only when used (avoids Node build issues).
import type { ISqliteAdapter, Params } from '../types';

type Quick = any;

export class ReactNativeQuickAdapter implements ISqliteAdapter {
  private dbName: string;
  private id: string;
  private QuickSQLite: Quick | null = null;

  constructor(dbName: string, id?: string) {
    this.dbName = dbName;
    this.id = id ?? dbName;
  }

  async init() {
    // Lazy dynamic import to keep Node builds happy
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const mod = await import('react-native-quick-sqlite');
    this.QuickSQLite = mod.default || mod;
    // Ensure DB exists (no-op if already open)
    if (!this.QuickSQLite) throw new Error('react-native-quick-sqlite not available');
    this.QuickSQLite.open(this.dbName);
  }

  getDatabaseId() { return this.id; }

  async execute<T=any>(sql: string, params?: Params): Promise<T[]> {
    if (!this.QuickSQLite) await this.init();
    const p = Array.isArray(params) ? params : (params && typeof params === 'object' ? Object.values(params) : []);
    const r = await this.QuickSQLite.executeAsync(this.dbName, sql, p);
    // r.rows is an array of objects already on recent versions
    const rows = (r?.rows ?? r?.rowsArray ?? []) as T[];
    return rows;
  }

  async exec(sql: string): Promise<void> {
    if (!this.QuickSQLite) await this.init();
    await this.QuickSQLite.executeAsync(this.dbName, sql, []);
  }
}
