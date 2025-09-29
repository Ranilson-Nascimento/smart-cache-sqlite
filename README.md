# smart-cache-sqlite

[![npm version](https://img.shields.io/npm/v/smart-cache-sqlite.svg)](https://www.npmjs.com/package/smart-cache-sqlite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://img.shields.io/github/actions/workflow/status/Ranilson-Nascimento/smart-cache-sqlite/ci.yml)](https://github.com/Ranilson-Nascimento/smart-cache-sqlite/actions)

> **EN** • [PT-BR](#pt-br)

An intelligent caching layer for SQLite with TTL, LRU, table-based invalidation, and modern strategies: `cache-first`, `network-first`, `stale-while-revalidate`.

- High performance - Works with `better-sqlite3` (sync) and `sqlite3` (async)
- 3 Strategies - Cache-First, Network-First, and Stale-While-Revalidate
- Automatic invalidation - Via `PRAGMA data_version` + optional table triggers
- Complete telemetry - Hit rate, performance, and memory usage statistics
- React Native - Ready adapter for Expo and other platforms
- Well tested - Full coverage + automated CI/CD

## Interactive Demo

[![Demo Online](https://img.shields.io/badge/Demo-Interactive-4f46e5)](https://ranilson-nascimento.github.io/smart-cache-sqlite/)

Test the cache working in real time! Execute queries, see live statistics, and try different strategies:

```bash
npm install
npm run demo
# -> http://localhost:3000 (local)
# -> https://ranilson-nascimento.github.io/smart-cache-sqlite/ (online)
```

## Support the Project

If smart-cache-sqlite is helping your project, consider supporting development:

[![GitHub Sponsors](https://img.shields.io/badge/sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#white)](https://github.com/sponsors/Ranilson-Nascimento)

## Installation

```bash
# For Node.js (recommended)
npm install smart-cache-sqlite better-sqlite3

# For projects using async sqlite3
npm install smart-cache-sqlite sqlite3
```

## Basic Usage

```typescript
import { SmartCache } from 'smart-cache-sqlite';
import Database from 'better-sqlite3';

// Create database connection
const db = new Database('my_database.db');

// Create smart cache
const cache = new SmartCache(db, {
  maxItems: 1000,           // Maximum items in cache
  ttlMs: 5 * 60 * 1000,     // 5 minutes TTL
  strategy: 'cache-first'   // Default strategy
});

// Use cache for queries - automatically detects database changes!
const users = cache.query('SELECT * FROM users WHERE city = ?', ['Sao Paulo']);
console.log(users.rows); // Data from cache or database
console.log(users.fromCache); // true if served from cache
```
import { SmartCache } from 'smart-cache-sqlite';
import Database from 'better-sqlite3';

// Criar conexão com o banco
const db = new Database('meu_banco.db');

// Criar cache inteligente
const cache = new SmartCache(db, {
  maxItems: 1000,           // Máximo de itens em cache
  ttlMs: 5 * 60 * 1000,     // 5 minutos de TTL
  strategy: 'cache-first'   // Estratégia padrão
});

// Usar o cache - automaticamente detecta mudanças no banco!
const usuarios = cache.query('SELECT * FROM usuarios WHERE cidade = ?', ['São Paulo']);
console.log(usuarios.rows); // Dados do cache ou banco
console.log(usuarios.fromCache); // true se veio do cache
```

## Cache Strategies

### Cache-First (Default)
Ideal for data that doesn't change frequently. Always tries to serve from cache first.

```typescript
const cache = new SmartCache(db, { strategy: 'cache-first' });
```

### Network-First
For critical data that needs to be always up-to-date. Always queries the database first.

```typescript
const cache = new SmartCache(db, { strategy: 'network-first' });
```

### Stale-While-Revalidate
Best user experience. Serves cached data immediately, but revalidates in background.

```typescript
const cache = new SmartCache(db, { strategy: 'stale-while-revalidate' });
```

## Automatic Invalidation

The cache automatically detects database changes using SQLite's `PRAGMA data_version`. For even more precise invalidation, use table triggers:

```typescript
import { ChangeTracker } from 'smart-cache-sqlite';

const tracker = new ChangeTracker(db, () => cache.invalidateAll());

// Install triggers for specific tables
await tracker.installTableTriggers('users');
await tracker.installTableTriggers('orders');
```

## Monitoring and Statistics

```typescript
// Get detailed statistics
const stats = cache.stats();

console.log('Hit rate:', Math.round(stats.hitRate * 100) + '%');
console.log('Total queries:', stats.totalQueries);
console.log('Items in cache:', stats.totalItems);
console.log('Hits/Misses:', stats.cacheHits, '/', stats.cacheMisses);
```

## React Native / Expo

Ready adapter for React Native:

```typescript
import { SmartCache } from 'smart-cache-sqlite';
import { ReactNativeQuickAdapter } from 'smart-cache-sqlite/dist/adapters/ReactNativeQuickAdapter.js';

const adapter = new ReactNativeQuickAdapter('app.db');
const cache = new SmartCache(adapter, {
  maxItems: 500,
  ttlMs: 10 * 60 * 1000,  // 10 minutes
  strategy: 'cache-first'
});
```

Expo demo: `examples/expo-smart-cache/`

## Benchmarks

Compare performance with and without cache:

```bash
npm run bench
```

Example result:
```
{
  "runs": 5000,
  "raw_ms": 1250,
  "cached_ms": 45,
  "speedup": "27.8x"
}
```

## Advanced Examples

### Complex Queries with JOIN
```typescript
const orders = cache.query(`
  SELECT o.*, u.name as user_name
  FROM orders o
  JOIN users u ON o.user_id = u.id
  WHERE o.status = ?
  ORDER BY o.order_date DESC
  LIMIT ?
`, ['pending', 50]);
```

### Manual Invalidation
```typescript
// Clear entire cache
cache.invalidateAll();

// Clear specific queries (future)
// cache.invalidatePattern('SELECT * FROM users WHERE %');
```

## Complete Configuration

```typescript
const cache = new SmartCache(db, {
  // Cache
  maxItems: 1000,                    // Maximum items (LRU)
  ttlMs: 5 * 60 * 1000,             // Time to live (5 min)

  // Strategy
  strategy: 'cache-first',           // cache-first | network-first | stale-while-revalidate

  // Invalidation
  enableTriggers: false,             // Use table triggers for fine invalidation
  trackedTables: ['users'],          // Tables to monitor

  // Debug
  verbose: false                     // Detailed logging
});
```

## Contributing

Contributions are welcome! Check the advanced examples and tests for more details.

```bash
# Development
npm install
npm run dev

# Tests
npm test

# Build
npm run build
```

## License

[MIT](./LICENSE) - Made with care by [Ranilson Nascimento](https://github.com/Ranilson-Nascimento)

---

## PT-BR

### Interactive Demo
[![Demo Online](https://img.shields.io/badge/Demo-Interativo-4f46e5)](https://ranilson-nascimento.github.io/smart-cache-sqlite/)

### Installation
```bash
npm install smart-cache-sqlite better-sqlite3
```

### Basic Usage
```typescript
import { SmartCache } from 'smart-cache-sqlite';
import Database from 'better-sqlite3';

const db = new Database('meu_banco.db');
const cache = new SmartCache(db, {
  maxItems: 1000,
  ttlMs: 5 * 60 * 1000,
  strategy: 'cache-first'
});

const usuarios = cache.query('SELECT * FROM usuarios WHERE cidade = ?', ['São Paulo']);
```

### Strategies
- **Cache-First**: For static data
- **Network-First**: For critical data
- **Stale-While-Revalidate**: Best user experience

### Automatic Invalidation

The cache automatically detects database changes using SQLite's `PRAGMA data_version`. For even more precise invalidation, use table triggers:

```typescript
import { ChangeTracker } from 'smart-cache-sqlite';

const tracker = new ChangeTracker(db, () => cache.invalidateAll());

// Install triggers for specific tables
await tracker.installTableTriggers('usuarios');
await tracker.installTableTriggers('pedidos');
```

### Monitoring and Statistics

```typescript
// Get detailed statistics
const stats = cache.stats();

console.log('Hit rate:', Math.round(stats.hitRate * 100) + '%');
console.log('Total queries:', stats.totalQueries);
console.log('Items in cache:', stats.totalItems);
```

### React Native / Expo

Ready adapter for React Native:

```typescript
import { SmartCache } from 'smart-cache-sqlite';
import { ReactNativeQuickAdapter } from 'smart-cache-sqlite/dist/adapters/ReactNativeQuickAdapter.js';

const adapter = new ReactNativeQuickAdapter('app.db');
const cache = new SmartCache(adapter, {
  maxItems: 500,
  ttlMs: 10 * 60 * 1000,  // 10 minutes
  strategy: 'cache-first'
});
```

### Support the Project
[![GitHub Sponsors](https://img.shields.io/badge/sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#white)](https://github.com/sponsors/Ranilson-Nascimento)
