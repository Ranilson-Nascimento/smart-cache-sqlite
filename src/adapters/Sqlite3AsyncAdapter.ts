import { ISqliteAdapter, Params } from '../types';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

export class Sqlite3AsyncAdapter implements ISqliteAdapter {
  private db!: Database;
  private id: string;

  constructor(dbFile: string, id?: string) {
    this.id = id ?? dbFile;
    // lazy init
    // caller should call init()
  }

  async init(dbFile: string) {
    this.db = await open({ filename: dbFile, driver: sqlite3.Database });
  }

  async execute<T=any>(sql: string, params?: Params): Promise<T[]> {
    if (!this.db) throw new Error('Sqlite3AsyncAdapter not initialized. Call init(dbFile).');
    if (Array.isArray(params)) return this.db.all<T[]>(sql, params as any);
    if (params && typeof params === 'object') return this.db.all<T[]>(sql, params as any);
    return this.db.all<T[]>(sql);
  }

  async exec(sql: string): Promise<void> {
    if (!this.db) throw new Error('Sqlite3AsyncAdapter not initialized. Call init(dbFile).');
    await this.db.exec(sql);
  }

  getDatabaseId() { return this.id; }
}
