import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { SmartCache, BetterSqliteAdapter } from '../../dist/index.js';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbFile = path.join(__dirname, 'demo.db');
const db = new Database(dbFile);
db.exec(`
  CREATE TABLE IF NOT EXISTS clientes(id INTEGER PRIMARY KEY, nome TEXT, cidade TEXT);
  INSERT OR IGNORE INTO clientes(id, nome, cidade) VALUES
    (1,'Ana','Marília'), (2,'Bruno','Pompéia'), (3,'Carla','Marília');
`);

const adapter = new BetterSqliteAdapter(dbFile);
const cache = new SmartCache(adapter, { defaultTtlMs: 15_000, verbose: true });

app.get('/api/clientes', async (req, res) => {
  const cidade = String(req.query.cidade || 'Marília');
  const strategy = String(req.query.strategy || 'cache-first');
  const out = await cache.query('SELECT * FROM clientes WHERE cidade = ?', [cidade], { strategy });
  res.json(out);
});

app.get('/api/stats', (_req, res) => {
  res.json(cache.stats());
});

app.post('/api/invalidate', (_req, res) => {
  cache.invalidateAll();
  res.json({ ok: true });
});

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(3000, () => console.log('Demo on http://localhost:3000'));
