import { CacheEntry, ISqliteAdapter, LRUOptions, QueryOptions, QueryResult } from './types';
import { LRUMap } from './utils/LRU';
import { extractTables } from './utils/sqlTables';
import { ChangeTracker } from './invalidation/ChangeTracker';
import logger from './logger';

type Row = Record<string, unknown>;

export interface SmartCacheOptions {
  defaultTtlMs?: number;   // TTL padrão
  lru?: LRUOptions;        // Limites do LRU
  watchChanges?: boolean;  // Habilita ChangeTracker (invalidação ampla)
  pollingMs?: number;      // Intervalo do ChangeTracker
  verbose?: boolean;       // Logs
}

export class SmartCache {
  private adapter: ISqliteAdapter;
  private cache = new LRUMap<string, CacheEntry<QueryResult<Row>>>();
  private options: Required<SmartCacheOptions>;
  private tracker: ChangeTracker | null = null;
  private lastTouchCheck = Date.now();
  private _stats = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  constructor(adapter: ISqliteAdapter, options?: SmartCacheOptions) {
    this.adapter = adapter;
    this.options = {
      defaultTtlMs: options?.defaultTtlMs ?? 15_000,
      lru: options?.lru ?? { maxItems: 5_000 },
      watchChanges: options?.watchChanges ?? true,
      pollingMs: options?.pollingMs ?? 1500,
      verbose: options?.verbose ?? false
    };
    if (this.options.watchChanges) {
      this.tracker = new ChangeTracker(this.adapter, this.invalidateAll.bind(this), this.options.pollingMs);
      this.tracker.start();
    }
  }

  stop() {
    this.tracker?.stop();
  }

  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: any) {
    if (this.options.verbose) {
      logger.log(level, message, {
        service: 'smart-cache-sqlite',
        dbId: this.adapter.getDatabaseId?.(),
        ...meta
      });
    }
  }

  private now() { return Date.now(); }

  private makeKey(sql: string, params?: any, keyOverride?: string) {
    const dbid = this.adapter.getDatabaseId?.() ?? 'db';
    const raw = keyOverride ?? JSON.stringify([dbid, sql, params]);
    return `v1:${raw}`;
  }

  private isExpired(entry: CacheEntry<any>) {
    return this.now() >= entry.expiresAt;
  }

  private setEntry(key: string, entry: CacheEntry<QueryResult<Row>>) {
    this.cache.set(key, entry);
  }

  private getEntry(key: string): CacheEntry<QueryResult<Row>> | undefined {
    return this.cache.get(key);
  }

  async query<RowT=Row>(sql: string, params?: any, opts?: QueryOptions): Promise<QueryResult<RowT>> {
    this._stats.totalQueries++;
    const strategy = opts?.strategy ?? 'cache-first';
    const key = this.makeKey(sql, params, opts?.key);

    this.log('debug', 'Query executed', {
      strategy,
      key,
      sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
      params
    });

    const maxRows = opts?.maxRows ?? Infinity;
    const ttl = opts?.ttlMs ?? this.options.defaultTtlMs;
    const touchedTables = new Set((opts?.tables && opts.tables.length > 0 ? opts.tables : extractTables(sql)).map(t => t.toLowerCase()));

    const tryNetwork = async (): Promise<QueryResult<RowT>> => {
      const rows = await this.adapter.execute<RowT>(sql, params);
      const limited = rows.slice(0, Number.isFinite(maxRows) ? (maxRows as number) : rows.length);
      const entry: CacheEntry<QueryResult<RowT>> = {
        value: { rows: limited, fromCache: false },
        expiresAt: this.now() + ttl,
        tables: touchedTables,
        tags: new Set(opts?.tags ?? []),
        lastAccess: this.now(),
        hits: 0
      };
      this.setEntry(key, entry as any);

      this.log('debug', 'Entry cached', {
        key,
        tables: Array.from(touchedTables),
        ttl,
        rowsCount: limited.length
      });

      return entry.value;
    };

    const fromCache = this.getEntry(key);

    if (strategy === 'network-first') {
      try {
        return await tryNetwork();
      } catch (e) {
        if (fromCache && !this.isExpired(fromCache)) {
          this.log('info', 'network-first fallback to cache', { key });
          return { ...fromCache.value, fromCache: true } as any;
        }
        throw e;
      }
    }

    if (strategy === 'stale-while-revalidate') {
      if (fromCache) {
        const expired = this.isExpired(fromCache);
        fromCache.hits++; fromCache.lastAccess = this.now();
        if (expired) {
          // dispara revalidação sem aguardar
          tryNetwork().then(v => {
            (v as any).revalidated = true;
          }).catch(() => {});
        }
        return { ...fromCache.value, fromCache: true } as any;
      }
      return await tryNetwork();
    }

    if (fromCache && !this.isExpired(fromCache)) {
      this._stats.cacheHits++;
      fromCache.hits++; fromCache.lastAccess = this.now();

      this.log('debug', 'Cache hit', {
        key,
        strategy,
        hits: fromCache.hits,
        age: this.now() - fromCache.lastAccess
      });

      return { ...fromCache.value, fromCache: true } as any;
    }
    this._stats.cacheMisses++;

    this.log('debug', 'Cache miss', { key, strategy });

    return await tryNetwork();
  }

    // Invalidação manual
  invalidateByKey(key: string) {
    const existed = this.cache.delete(key);
    this.log('info', 'Cache entry invalidated by key', { key, existed });
  }

  invalidateByTag(tag: string) {
    let count = 0;
    for (const k of this.cache.keys()) {
      const e = this.cache.get(k)!;
      if (e.tags.has(tag)) {
        this.cache.delete(k);
        count++;
      }
    }
    this.log('info', 'Cache entries invalidated by tag', { tag, count });
  }

  invalidateByTable(table: string) {
    const t = table.toLowerCase();
    let count = 0;
    for (const k of this.cache.keys()) {
      const e = this.cache.get(k)!;
      if (e.tables.has(t)) {
        this.cache.delete(k);
        count++;
      }
    }
    this.log('info', 'Cache entries invalidated by table', { table: t, count });
  }

  invalidateAll() {
    const count = this.cache['map'].size;
    this.cache.clear();
    this.log('warn', 'All cache entries invalidated', { count });
  }

  // Invalidação fina baseada nos triggers (se instalados)
  async invalidateTouchedSince(lastCheckMs: number) {
    if (!this.tracker) return;
    const touched = await this.tracker.getTouchedTables(lastCheckMs);
    touched.forEach(t => this.invalidateByTable(t));
    this.lastTouchCheck = Date.now();
  }

  // Telemetria
  stats() {
    const keys = this.cache.keys();
    const hitRate = this._stats.totalQueries > 0 ? this._stats.cacheHits / this._stats.totalQueries : 0;
    return {
      totalItems: keys.length,
      totalQueries: this._stats.totalQueries,
      cacheHits: this._stats.cacheHits,
      cacheMisses: this._stats.cacheMisses,
      hitRate: hitRate
    };
  }
}
