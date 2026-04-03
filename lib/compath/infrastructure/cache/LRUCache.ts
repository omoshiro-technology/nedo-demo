/**
 * シンプルなLRUキャッシュ実装
 * メモリリークを防ぐため、最大エントリ数とTTLを設定可能
 */
export class LRUCache<K, V> {
  private cache: Map<K, { value: V; timestamp: number }>;
  private readonly maxSize: number;
  private readonly ttlMs: number;

  /**
   * @param maxSize 最大エントリ数（デフォルト: 100）
   * @param ttlMs エントリの有効期限（ミリ秒、デフォルト: 5分）
   */
  constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * キャッシュから値を取得
   * アクセスされたエントリは最新として扱われる（LRU順序を更新）
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // TTLチェック
    if (this.isExpired(entry.timestamp)) {
      this.cache.delete(key);
      return undefined;
    }

    // LRU順序を更新（削除して再挿入）
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * キャッシュに値を設定
   */
  set(key: K, value: V): void {
    // 既存のエントリがあれば削除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 最大サイズに達したら最も古いエントリを削除
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * キャッシュにエントリが存在するかチェック（TTLも考慮）
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (this.isExpired(entry.timestamp)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * キャッシュからエントリを削除
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * キャッシュのサイズを取得
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 期限切れのエントリをすべて削除
   */
  prune(): number {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * 最も古いエントリを削除
   */
  private evictOldest(): void {
    // Map のイテレータは挿入順なので、最初の要素が最も古い
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * タイムスタンプが期限切れかどうかをチェック
   */
  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.ttlMs;
  }
}
