import { ISqliteAdapter } from '../types';

export class ChangeTracker {
  private adapter: ISqliteAdapter;
  private lastDataVersion: number | null = null;
  private pollingMs: number;
  private timer: NodeJS.Timeout | null = null;
  private onChange: (tables?: string[]) => void;

  constructor(adapter: ISqliteAdapter, onChange: (tables?: string[]) => void, pollingMs = 1500) {
    this.adapter = adapter;
    this.onChange = onChange;
    this.pollingMs = pollingMs;
  }

  async start() {
    await this.tick();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async tick() {
    try {
      const rows = await this.adapter.execute<{ data_version: number }>('PRAGMA data_version;');
      const dv = rows?.[0]?.data_version ?? 0;
      if (this.lastDataVersion !== null && dv !== this.lastDataVersion) {
        // algo mudou. Não sabemos quais tabelas; invalidamos por chave ampla
        this.onChange();
      }
      this.lastDataVersion = dv;
    } catch (e) {
      // ignore
    } finally {
      this.timer = setTimeout(() => this.tick(), this.pollingMs);
    }
  }

  // Helpers para instalar triggers de invalidação fina por tabela
  async installTableTriggers(table: string) {
    const t = table.replace(/[^a-zA-Z0-9_]/g, '');
    const stampTable = '_smart_cache_sqlite_touch';
    await this.adapter.exec(`CREATE TABLE IF NOT EXISTS ${stampTable}(tbl TEXT PRIMARY KEY, ts INTEGER);`);
    const trg = (op: 'INSERT'|'UPDATE'|'DELETE') => `
      CREATE TRIGGER IF NOT EXISTS trg_${t}_${op.toLowerCase()} AFTER ${op} ON ${t}
      BEGIN
        INSERT INTO ${stampTable}(tbl, ts) VALUES ('${t}', CAST((julianday('now')-2440587.5)*86400000 AS INTEGER))
        ON CONFLICT(tbl) DO UPDATE SET ts=excluded.ts;
      END;`;
    await this.adapter.exec(trg('INSERT'));
    await this.adapter.exec(trg('UPDATE'));
    await this.adapter.exec(trg('DELETE'));
  }

  async getTouchedTables(sinceMs: number): Promise<string[]> {
    const stampTable = '_smart_cache_sqlite_touch';
    const rows = await this.adapter.execute<{tbl:string, ts:number}>(`SELECT tbl, ts FROM ${stampTable} WHERE ts >= ?`, [sinceMs]);
    return rows?.map(r => r.tbl) ?? [];
  }
}
