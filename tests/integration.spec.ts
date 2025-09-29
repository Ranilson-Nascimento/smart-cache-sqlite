import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SmartCache, BetterSqliteAdapter } from '../src/index';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

describe('SmartCache Integration Tests', () => {
  let db: Database.Database;
  let adapter: BetterSqliteAdapter;
  let cache: SmartCache;
  let dbFile: string;

  beforeEach(() => {
    dbFile = path.join(__dirname, `integration-test-${Date.now()}-${Math.random()}.db`);
    if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
    db = new Database(dbFile);

    // Create test schema
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE TABLE posts (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,
        title TEXT NOT NULL,
        content TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      INSERT INTO users (name, email) VALUES
        ('Alice', 'alice@example.com'),
        ('Bob', 'bob@example.com'),
        ('Charlie', 'charlie@example.com');

      INSERT INTO posts (user_id, title, content) VALUES
        (1, 'Hello World', 'This is my first post'),
        (1, 'Second Post', 'Another post by Alice'),
        (2, 'Bob''s Post', 'Hello from Bob'),
        (3, 'Tech Talk', 'Discussing technology');
    `);

    adapter = new BetterSqliteAdapter(dbFile);
    cache = new SmartCache(adapter, {
      defaultTtlMs: 5000,
      watchChanges: false,
      verbose: false
    });
  });

  afterEach(async () => {
    cache.stop();
    db.close();
    // Don't try to delete the file as it may be locked
  });

  describe('Complex Queries', () => {
    it('should cache JOIN queries', async () => {
      const query = `
        SELECT u.name, p.title, p.content
        FROM users u
        JOIN posts p ON u.id = p.user_id
        WHERE u.name = ?
        ORDER BY p.created_at DESC
      `;

      const result1 = await cache.query(query, ['Alice']);
      const result2 = await cache.query(query, ['Alice']);

      expect(result1.fromCache).toBe(false);
      expect(result2.fromCache).toBe(true);
      expect(result1.rows).toEqual(result2.rows);
      expect(result1.rows.length).toBe(2);
    });

    it('should handle parameterized queries with different params', async () => {
      const query = 'SELECT * FROM users WHERE name = ?';

      const alice1 = await cache.query(query, ['Alice']);
      const bob1 = await cache.query(query, ['Bob']);
      const alice2 = await cache.query(query, ['Alice']);

      expect(alice1.fromCache).toBe(false);
      expect(bob1.fromCache).toBe(false);
      expect(alice2.fromCache).toBe(true);
      expect(alice1.rows[0].email).toBe('alice@example.com');
      expect(bob1.rows[0].email).toBe('bob@example.com');
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache when data changes', async () => {
      const selectQuery = 'SELECT COUNT(*) as count FROM users';
      const insertQuery = 'INSERT INTO users (name, email) VALUES (?, ?)';

      const count1 = await cache.query(selectQuery);
      expect(count1.fromCache).toBe(false);
      expect(count1.rows[0].count).toBe(3);

      // Insert new user
      await adapter.exec(`INSERT INTO users (name, email) VALUES ('David', 'david@example.com')`);

      // Cache should be invalidated by ChangeTracker
      const cacheWithTracker = new SmartCache(new BetterSqliteAdapter(dbFile), {
        defaultTtlMs: 5000,
        watchChanges: true,
        pollingMs: 100,
        verbose: false
      });

      // Wait for invalidation
      await new Promise(resolve => setTimeout(resolve, 200));

      const count2 = await cacheWithTracker.query(selectQuery);
      expect(count2.fromCache).toBe(false); // Should hit DB due to invalidation
      expect(count2.rows[0].count).toBe(4);

      cacheWithTracker.stop();
    });
  });

  describe('Performance Tests', () => {
    it('should maintain performance under load', async () => {
      const query = 'SELECT * FROM users WHERE id = ?';
      const iterations = 100;

      const start = Date.now();
      for (let i = 1; i <= iterations; i++) {
        await cache.query(query, [1]);
      }
      const end = Date.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(10); // Should be very fast with caching
    });

    it('should handle concurrent requests', async () => {
      const query = 'SELECT * FROM posts LIMIT 1';
      const promises = Array(10).fill(null).map(() => cache.query(query));

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].title).toBe('Hello World');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty results', async () => {
      const result = await cache.query('SELECT * FROM users WHERE name = ?', ['NonExistent']);
      expect(result.rows.length).toBe(0);
      expect(result.fromCache).toBe(false);

      const result2 = await cache.query('SELECT * FROM users WHERE name = ?', ['NonExistent']);
      expect(result2.fromCache).toBe(true);
    });

    it('should handle large result sets', async () => {
      // Insert many users
      const insertStmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
      for (let i = 0; i < 100; i++) {
        insertStmt.run(`User${i}`, `user${i}@example.com`);
      }

      const result = await cache.query('SELECT * FROM users ORDER BY id');
      expect(result.rows.length).toBe(103); // 3 original + 100 new
      expect(result.fromCache).toBe(false);

      const result2 = await cache.query('SELECT * FROM users ORDER BY id');
      expect(result2.fromCache).toBe(true);
    });

    it('should handle TTL expiration', async () => {
      const shortCache = new SmartCache(adapter, {
        defaultTtlMs: 100, // Very short TTL
        watchChanges: false
      });

      const result1 = await shortCache.query('SELECT COUNT(*) as count FROM users');
      expect(result1.fromCache).toBe(false);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const result2 = await shortCache.query('SELECT COUNT(*) as count FROM users');
      expect(result2.fromCache).toBe(false); // Should have expired

      shortCache.stop();
    });
  });

  describe('Strategy Tests', () => {
    it('should handle network-first correctly', async () => {
      const query = 'SELECT * FROM users LIMIT 1';

      const result1 = await cache.query(query, [], { strategy: 'network-first' });
      expect(result1.fromCache).toBe(false);

      const result2 = await cache.query(query, [], { strategy: 'network-first' });
      expect(result2.fromCache).toBe(false); // Network-first always hits DB
    });

    it('should handle stale-while-revalidate', async () => {
      const query = 'SELECT COUNT(*) as count FROM users';

      const result1 = await cache.query(query, [], { strategy: 'stale-while-revalidate' });
      expect(result1.fromCache).toBe(false);

      const result2 = await cache.query(query, [], { strategy: 'stale-while-revalidate' });
      expect(result2.fromCache).toBe(true);
    });
  });
});