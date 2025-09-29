# React Native Example

> Este exemplo demonstra como integrar **smart-cache-sqlite** em um app React Native.
> Você precisa implementar um **Adapter** compatível com a interface `ISqliteAdapter` usando sua lib de SQLite preferida (ex.: `react-native-quick-sqlite`, `react-native-sqlite-storage`).

Passos:
1. Crie um adapter que implemente:
   - `execute(sql, params?)` retornando `Promise<any[]>`
   - `exec(sql)` para comandos sem retorno
   - `getDatabaseId()` opcional
2. Instancie `new SmartCache(adapter, { defaultTtlMs: 15000 })`
3. Use `cache.query(sql, params, opts)` nas telas e serviços.
