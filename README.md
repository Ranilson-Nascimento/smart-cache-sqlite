# smart-cache-sqlite

[![npm version](https://img.shields.io/npm/v/smart-cache-sqlite.svg)](https://www.npmjs.com/package/smart-cache-sqlite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://img.shields.io/github/actions/workflow/status/Ranilson-Nascimento/smart-cache-sqlite/ci.yml)](https://github.com/Ranilson-Nascimento/smart-cache-sqlite/actions)
[![Coverage](./.github/badges/coverage.svg)](https://github.com/Ranilson-Nascimento/smart-cache-sqlite)

> **EN** • [🇧🇷 PT-BR](#pt-br)

**Camada de cache inteligente para SQLite** com TTL, LRU, invalidação automática por tabela e estratégias modernas: `cache-first`, `network-first`, `stale-while-revalidate`.

- ⚡ **Alta performance** - Funciona com `better-sqlite3` (síncrono) e `sqlite3` (assíncrono)
- 🎯 **3 Estratégias** - Cache-First, Network-First e Stale-While-Revalidate
- 🔄 **Invalidação automática** - Via `PRAGMA data_version` + triggers opcionais por tabela
- 📊 **Telemetria completa** - Estatísticas de hit rate, performance e uso de memória
- 📱 **React Native** - Adapter pronto para Expo e outras plataformas
- 🧪 **Testado** - Cobertura completa + CI/CD automatizado

## 🚀 Demonstração Interativa

[![Demo Online](https://img.shields.io/badge/🎮%20Demo%20Interativo-abrir%20demo-4f46e5)](https://ranilson-nascimento.github.io/smart-cache-sqlite/)

**Teste o cache funcionando em tempo real!** Execute queries, veja estatísticas ao vivo e experimente as diferentes estratégias:

```bash
npm install
npm run demo
# 👉 http://localhost:3000 (local)
# 🌐 https://ranilson-nascimento.github.io/smart-cache-sqlite/ (online)
```

## 💝 Apoie o Projeto

Se o **smart-cache-sqlite** está ajudando seu projeto, considere apoiar o desenvolvimento:

[![GitHub Sponsors](https://img.shields.io/badge/sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#white)](https://github.com/sponsors/Ranilson-Nascimento)
[![Buy me a coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/ranilson)

## 📦 Instalação

```bash
# Para Node.js (recomendado)
npm install smart-cache-sqlite better-sqlite3

# Para projetos que usam sqlite3 assíncrono
npm install smart-cache-sqlite sqlite3
```

## ⚡ Uso Básico

```typescript
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

## 🎯 Estratégias de Cache

### Cache-First (Padrão)
Ideal para dados que não mudam frequentemente. Sempre tenta servir do cache primeiro.

```typescript
const cache = new SmartCache(db, { strategy: 'cache-first' });
```

### Network-First
Para dados críticos que precisam estar sempre atualizados. Sempre busca no banco primeiro.

```typescript
const cache = new SmartCache(db, { strategy: 'network-first' });
```

### Stale-While-Revalidate
Melhor experiência do usuário. Serve dados do cache imediatamente, mas revalida em background.

```typescript
const cache = new SmartCache(db, { strategy: 'stale-while-revalidate' });
```

## 🔄 Invalidação Automática

O cache detecta mudanças automaticamente usando `PRAGMA data_version` do SQLite. Para invalidação ainda mais precisa, use triggers por tabela:

```typescript
import { ChangeTracker } from 'smart-cache-sqlite';

const tracker = new ChangeTracker(db, () => cache.invalidateAll());

// Instalar triggers para tabelas específicas
await tracker.installTableTriggers('usuarios');
await tracker.installTableTriggers('pedidos');
```

## 📊 Monitoramento e Estatísticas

```typescript
// Obter estatísticas detalhadas
const stats = cache.stats();

console.log('Taxa de acerto:', Math.round(stats.hitRate * 100) + '%');
console.log('Total de consultas:', stats.totalQueries);
console.log('Itens em cache:', stats.totalItems);
console.log('Hits/Misses:', stats.cacheHits, '/', stats.cacheMisses);
```

## 📱 React Native / Expo

Adapter pronto para React Native:

```typescript
import { SmartCache } from 'smart-cache-sqlite';
import { ReactNativeQuickAdapter } from 'smart-cache-sqlite/dist/adapters/ReactNativeQuickAdapter.js';

const adapter = new ReactNativeQuickAdapter('app.db');
const cache = new SmartCache(adapter, {
  maxItems: 500,
  ttlMs: 10 * 60 * 1000,  // 10 minutos
  strategy: 'cache-first'
});
```

**Demo Expo:** `examples/expo-smart-cache/`

## 🧪 Benchmarks

Compare performance com e sem cache:

```bash
npm run bench
```

Exemplo de resultado:
```
{
  "runs": 5000,
  "raw_ms": 1250,
  "cached_ms": 45,
  "speedup": "27.8x"
}
```

## 📚 Exemplos Avançados

### Queries Complexas com JOIN
```typescript
const pedidos = cache.query(`
  SELECT p.*, c.nome as cliente_nome
  FROM pedidos p
  JOIN clientes c ON p.cliente_id = c.id
  WHERE p.status = ?
  ORDER BY p.data_pedido DESC
  LIMIT ?
`, ['pendente', 50]);
```

### Invalidação Manual
```typescript
// Limpar todo o cache
cache.invalidateAll();

// Limpar queries específicas (futuro)
// cache.invalidatePattern('SELECT * FROM usuarios WHERE %');
```

## 🔧 Configuração Completa

```typescript
const cache = new SmartCache(db, {
  // Cache
  maxItems: 1000,                    // Máximo de itens (LRU)
  ttlMs: 5 * 60 * 1000,             // Tempo de vida (5 min)

  // Estratégia
  strategy: 'cache-first',           // cache-first | network-first | stale-while-revalidate

  // Invalidação
  enableTriggers: false,             // Usar triggers para invalidação fina
  trackedTables: ['usuarios'],       // Tabelas para monitorar

  // Debug
  verbose: false                     // Log detalhado
});
```

## 🤝 Contribuição

Contribuições são bem-vindas! Veja os [exemplos avançados](examples/advanced-swr/) e [testes](tests/) para entender melhor.

```bash
# Desenvolvimento
npm install
npm run dev

# Testes
npm test

# Build
npm run build
```

## 📄 Licença

[MIT](./LICENSE) - Feito com ❤️ por [Ranilson Nascimento](https://github.com/Ranilson-Nascimento)

---

## 🇧🇷 PT-BR

### Demonstração Interativa
[![🎮 Demo](https://img.shields.io/badge/🎮%20Demo-abrir%20demo-4f46e5)](http://localhost:3000)

### Instalação
```bash
npm install smart-cache-sqlite better-sqlite3
```

### Uso Básico
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

### Estratégias
- **Cache-First**: Para dados estáticos
- **Network-First**: Para dados críticos
- **Stale-While-Revalidate**: Melhor UX

### Apoie o Projeto
[![GitHub Sponsors](https://img.shields.io/badge/sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#white)](https://github.com/sponsors/Ranilson-Nascimento)
