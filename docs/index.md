# smart-cache-sqlite

> Intelligent caching for SQLite — TTL, LRU, table invalidation, and SWR.

- ✅ Cache strategies: **cache-first**, **network-first**, **stale-while-revalidate**
- ✅ Invalidate by **table**, **tag**, or **global**
- ✅ `ChangeTracker` using `PRAGMA data_version`
- ✅ Optional **triggers** per table
- ✅ Works with **better-sqlite3**; adapters possible for **sqlite3** and **React Native**

## Get Started
```bash
npm i smart-cache-sqlite better-sqlite3
```

```ts
import { SmartCache, BetterSqliteAdapter } from 'smart-cache-sqlite';
const cache = new SmartCache(new BetterSqliteAdapter('app.db'));
const out = await cache.query('SELECT * FROM clientes WHERE cidade = ?', ['Marília']);
```

## Links
- GitHub: https://github.com/Ranilson-Nascimento/smart-cache-sqlite
- Sponsor: https://github.com/sponsors/Ranilson-Nascimento
