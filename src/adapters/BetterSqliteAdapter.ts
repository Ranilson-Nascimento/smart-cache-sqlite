import Database from 'better-sqlite3';
import { ISqliteAdapter, Params } from '../types';

export class BetterSqliteAdapter implements ISqliteAdapter {
  private db: Database.Database;
  private id: string;

  constructor(dbFile: string, id?: string) {
    this.db = new Database(dbFile);
    this.id = id ?? dbFile;
  }

  async execute<T=any>(sql: string, params?: Params): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    if (Array.isArray(params)) return stmt.all(...params) as T[];
    if (params && typeof params === 'object') return stmt.all(params as any) as T[];
    return stmt.all() as T[];
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  getDatabaseId() { return this.id; }
}
