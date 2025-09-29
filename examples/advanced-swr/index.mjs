import { SmartCache, BetterSqliteAdapter, ChangeTracker } from '../../dist/index.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, 'advanced.db');
const db = new Database(dbFile);
db.exec(`
  CREATE TABLE IF NOT EXISTS produtos(id INTEGER PRIMARY KEY, nome TEXT, preco REAL, atualizado_em INTEGER);
  INSERT OR IGNORE INTO produtos(id, nome, preco, atualizado_em) VALUES
    (1,'Teclado',120, strftime('%s','now')*1000),
    (2,'Mouse', 80,  strftime('%s','now')*1000);
`);

const adapter = new BetterSqliteAdapter(dbFile);
const cache = new SmartCache(adapter, { defaultTtlMs: 10_000, verbose: true });
const tracker = new ChangeTracker(adapter, () => cache.invalidateAll());
await tracker.installTableTriggers('produtos');

// SWR scheduled revalidate (cada 5s)
setInterval(async () => {
  // revalida silenciosamente a lista de produtos; chave é igual então sobrescreve
  await cache.query('SELECT * FROM produtos ORDER BY atualizado_em DESC', [], { strategy: 'network-first', key: 'produtos:list' });
  console.log('[SWR] revalidated produtos:list');
}, 5000);

// Invalidar reagindo aos triggers (invalidação fina)
setInterval(async () => {
  const since = Date.now() - 10_000;
  await cache.invalidateTouchedSince(since);
  console.log('[touch] invalidated touched tables since', since);
}, 4000);

// App loop
const loop = async () => {
  const out = await cache.query('SELECT * FROM produtos ORDER BY atualizado_em DESC', [], { strategy: 'stale-while-revalidate', key: 'produtos:list' });
  console.log('fromCache=', out.fromCache, 'rows=', out.rows.length);
};

setInterval(loop, 3000);
console.log('Advanced SWR demo running. Edit the DB to see changes reflected.');
