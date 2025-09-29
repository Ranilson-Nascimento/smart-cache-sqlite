import { describe, it, expect, beforeEach } from 'vitest';
import { SmartCache } from '../src/SmartCache';
import { BetterSqliteAdapter } from '../src/adapters/BetterSqliteAdapter';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

describe('SmartCache basic', () => {
  const dbFile = path.join(__dirname, `test-${Date.now()}.db`);
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
  const DB = new Database(dbFile);
  DB.exec(`CREATE TABLE t(id INTEGER PRIMARY KEY, v TEXT); INSERT INTO t(v) VALUES ('a'),('b'),('c');`);

  const adapter = new BetterSqliteAdapter(dbFile);
  const cache = new SmartCache(adapter, { defaultTtlMs: 1000, verbose:true, watchChanges: false });

  beforeEach(() => {
    cache.invalidateAll();
  });

  it('cache-first serves from cache', async () => {
    console.log('Starting cache-first test');
    const a = await cache.query('SELECT * FROM t WHERE id <= ?', [2], { strategy:'cache-first' });
    console.log('First query fromCache:', a.fromCache);
    const b = await cache.query('SELECT * FROM t WHERE id <= ?', [2], { strategy:'cache-first' });
    console.log('Second query fromCache:', b.fromCache);
    expect(a.fromCache).toBe(false);
    expect(b.fromCache).toBe(true);
    expect(b.rows.length).toBe(2);
  });

  it('network-first always hits db', async () => {
    const a = await cache.query('SELECT * FROM t WHERE id = ?', [1], { strategy:'network-first' });
    expect(a.fromCache).toBe(false);
  });

  it('stale-while-revalidate returns cached immediately', async () => {
    const a = await cache.query('SELECT * FROM t WHERE id = ?', [3], { strategy:'cache-first' });
    const b = await cache.query('SELECT * FROM t WHERE id = ?', [3], { strategy:'stale-while-revalidate' });
    expect(b.fromCache).toBe(true);
    expect(b.rows.length).toBe(1);
  });
});