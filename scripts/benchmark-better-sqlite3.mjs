import { SmartCache, BetterSqliteAdapter } from '../dist/index.js';
import Database from 'better-sqlite3';
import { performance } from 'node:perf_hooks';

// Use fewer runs in CI environment to avoid timeouts
const N = process.env.CI ? 1000 : Number(process.env.N||5000);
const dbFile = './bench.db';
const db = new Database(dbFile);
db.exec(`DROP TABLE IF EXISTS items; CREATE TABLE items(id INTEGER PRIMARY KEY, v TEXT);`);
const ins = db.prepare('INSERT INTO items(v) VALUES (?)');
db.transaction(() => {
  for (let i=0;i<5000;i++) ins.run('value-'+i);
})();

const adapter = new BetterSqliteAdapter(dbFile);
const cache = new SmartCache(adapter, { defaultTtlMs: 60_000, verbose:false });

const SQL = 'SELECT * FROM items WHERE id <= ?';
const PARAMS = [3000];

const t0 = performance.now();
for (let i=0;i<N;i++) {
  await adapter.execute(SQL, PARAMS);
}
const t1 = performance.now();

const t2 = performance.now();
for (let i=0;i<N;i++) {
  await cache.query(SQL, PARAMS, { strategy:'cache-first' });
}
const t3 = performance.now();

console.log(JSON.stringify({
  runs: N,
  raw_ms: Math.round(t1 - t0),
  cached_ms: Math.round(t3 - t2),
  speedup: ((t1 - t0) / (t3 - t2)).toFixed(2) + 'x'
}, null, 2));
