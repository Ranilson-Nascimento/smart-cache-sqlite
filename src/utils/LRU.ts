import { LRUOptions } from '../types';

export class LRUMap<K, V> {
  private map = new Map<K, V>();
  private order: K[] = [];
  private maxItems: number;

  constructor(opts?: LRUOptions) {
    this.maxItems = opts?.maxItems ?? 5000;
  }

  set(key: K, value: V) {
    if (this.map.has(key)) {
      this.order = this.order.filter(k => k !== key);
    }
    this.map.set(key, value);
    this.order.push(key);
    this.evictIfNeeded();
  }

  get(key: K): V | undefined {
    const val = this.map.get(key);
    if (val !== undefined) {
      this.order = this.order.filter(k => k !== key);
      this.order.push(key);
    }
    return val;
  }

  has(key: K) { return this.map.has(key); }

  delete(key: K) {
    this.map.delete(key);
    this.order = this.order.filter(k => k !== key);
  }

  clear() {
    this.map.clear();
    this.order = [];
  }

  keys(): K[] { return Array.from(this.map.keys()); }

  private evictIfNeeded() {
    while (this.order.length > this.maxItems) {
      const oldest = this.order.shift();
      if (oldest !== undefined) {
        this.map.delete(oldest);
      }
    }
  }
}
