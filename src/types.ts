export type Primitive = string | number | boolean | null;
export type Params = Record<string, Primitive> | Primitive[] | undefined;

export type Strategy = 'cache-first' | 'network-first' | 'stale-while-revalidate';

export interface QueryOptions {
  ttlMs?: number;                 // TTL específico da consulta
  tables?: string[];              // Tabelas tocadas pela consulta (para invalidação dirigida)
  strategy?: Strategy;            // Estratégia de cache
  key?: string;                   // Chave customizada se necessário
  tags?: string[];                // Tags para invalidação em lote
  maxRows?: number;               // Segurança: limitar linhas retornadas
}

export interface CacheEntry<T=unknown> {
  value: T;
  expiresAt: number;              // epoch ms
  tables: Set<string>;
  tags: Set<string>;
  lastAccess: number;
  hits: number;
}

export interface LRUOptions {
  maxItems?: number;
  maxMemoryMb?: number;
}

export interface QueryResult<Row=Record<string, unknown>> {
  rows: Row[];
  fromCache: boolean;
  revalidated?: boolean;
}

export interface ISqliteAdapter {
  execute<T=any>(sql: string, params?: Params): Promise<T[]>;
  exec(sql: string): Promise<void>;
  getDatabaseId?(): string; // opcional para compor a cacheKey por banco
}
