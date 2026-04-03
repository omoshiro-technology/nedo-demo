/**
 * メモリストア
 *
 * エージェントの永続メモリを管理する
 * 現在はインメモリ実装、将来的にVector DB（pgvector/Qdrant）に移行可能
 */

import { LRUCache } from "../cache/LRUCache";

/**
 * メモリエントリの型
 */
export type MemoryEntry = {
  /** 一意識別子 */
  id: string;
  /** メモリの種類 */
  type: MemoryType;
  /** 内容 */
  content: string;
  /** メタデータ */
  metadata: Record<string, unknown>;
  /** 埋め込みベクトル（将来のVector DB対応用） */
  embedding?: number[];
  /** 作成日時 */
  createdAt: number;
  /** 最終アクセス日時 */
  lastAccessedAt: number;
  /** アクセス回数 */
  accessCount: number;
  /** 有効期限（ミリ秒、0=無期限） */
  ttl: number;
};

/**
 * メモリの種類
 */
export type MemoryType =
  | "conversation"    // 会話履歴
  | "analysis_result" // 分析結果
  | "user_preference" // ユーザー設定
  | "tool_pattern"    // 成功したツール選択パターン
  | "knowledge";      // 抽出された知識

/**
 * 検索オプション
 */
export type SearchOptions = {
  /** メモリタイプでフィルタ */
  type?: MemoryType;
  /** 最大取得件数 */
  limit?: number;
  /** メタデータフィルタ */
  metadata?: Record<string, unknown>;
  /** セッションIDでフィルタ */
  sessionId?: string;
};

/**
 * メモリストアの設定
 */
export type MemoryStoreConfig = {
  /** 最大エントリ数 */
  maxEntries: number;
  /** デフォルトTTL（ミリ秒） */
  defaultTtl: number;
};

const DEFAULT_CONFIG: MemoryStoreConfig = {
  maxEntries: 1000,
  defaultTtl: 24 * 60 * 60 * 1000, // 24時間
};

/**
 * メモリストア実装
 */
export class MemoryStore {
  private cache: LRUCache<string, MemoryEntry>;
  private config: MemoryStoreConfig;
  private entries: Map<string, MemoryEntry> = new Map();

  constructor(config: Partial<MemoryStoreConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new LRUCache<string, MemoryEntry>(
      this.config.maxEntries,
      this.config.defaultTtl
    );

    console.log(`[MemoryStore] Initialized with max ${this.config.maxEntries} entries`);
  }

  /**
   * メモリを保存
   */
  save(entry: Omit<MemoryEntry, "createdAt" | "lastAccessedAt" | "accessCount">): void {
    const now = Date.now();
    const fullEntry: MemoryEntry = {
      ...entry,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
    };

    this.cache.set(entry.id, fullEntry);
    this.entries.set(entry.id, fullEntry);

    console.log(`[MemoryStore] Saved: ${entry.id} (${entry.type})`);
  }

  /**
   * IDでメモリを取得
   */
  get(id: string): MemoryEntry | undefined {
    const entry = this.cache.get(id);
    if (entry) {
      // アクセス情報を更新
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;
    }
    return entry;
  }

  /**
   * メモリを検索
   */
  search(query: string, options: SearchOptions = {}): MemoryEntry[] {
    const { type, limit = 10, metadata, sessionId } = options;
    const results: Array<{ entry: MemoryEntry; score: number }> = [];

    // 全エントリを走査（将来はVector検索に置き換え）
    for (const [, entry] of this.entries) {
      // キャッシュに存在しない場合はスキップ
      if (!this.cache.has(entry.id)) {
        continue;
      }

      // タイプフィルタ
      if (type && entry.type !== type) {
        continue;
      }

      // セッションIDフィルタ
      if (sessionId && entry.metadata.sessionId !== sessionId) {
        continue;
      }

      // メタデータフィルタ
      if (metadata) {
        let match = true;
        for (const [key, value] of Object.entries(metadata)) {
          if (entry.metadata[key] !== value) {
            match = false;
            break;
          }
        }
        if (!match) continue;
      }

      // 簡易的なテキスト類似度計算
      const score = this.calculateSimilarity(query, entry.content);
      if (score > 0) {
        results.push({ entry, score });
      }
    }

    // スコアでソートして上位N件を返す
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map((r) => r.entry);
  }

  /**
   * セッションのメモリを取得
   */
  getBySession(sessionId: string, type?: MemoryType): MemoryEntry[] {
    const results: MemoryEntry[] = [];

    for (const [, entry] of this.entries) {
      if (!this.cache.has(entry.id)) {
        continue;
      }

      if (entry.metadata.sessionId === sessionId) {
        if (!type || entry.type === type) {
          results.push(entry);
        }
      }
    }

    // 作成日時でソート
    results.sort((a, b) => a.createdAt - b.createdAt);
    return results;
  }

  /**
   * メモリを削除
   */
  delete(id: string): boolean {
    this.entries.delete(id);
    return this.cache.delete(id);
  }

  /**
   * セッションのメモリをすべて削除
   */
  deleteBySession(sessionId: string): number {
    let count = 0;
    const idsToDelete: string[] = [];

    for (const [id, entry] of this.entries) {
      if (entry.metadata.sessionId === sessionId) {
        idsToDelete.push(id);
      }
    }

    for (const id of idsToDelete) {
      if (this.delete(id)) {
        count++;
      }
    }

    console.log(`[MemoryStore] Deleted ${count} entries for session ${sessionId}`);
    return count;
  }

  /**
   * 期限切れエントリをクリーンアップ
   */
  cleanup(): number {
    const before = this.cache.size;
    const cleaned = this.cache.prune();

    // entriesからも削除
    for (const [id] of this.entries) {
      if (!this.cache.has(id)) {
        this.entries.delete(id);
      }
    }

    if (cleaned > 0) {
      console.log(`[MemoryStore] Cleaned up ${cleaned} stale entries`);
    }

    return cleaned;
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    totalEntries: number;
    byType: Record<MemoryType, number>;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const byType: Record<MemoryType, number> = {
      conversation: 0,
      analysis_result: 0,
      user_preference: 0,
      tool_pattern: 0,
      knowledge: 0,
    };

    let oldest: number | null = null;
    let newest: number | null = null;

    for (const [, entry] of this.entries) {
      if (!this.cache.has(entry.id)) {
        continue;
      }

      const entryType = entry.type;
      if (entryType in byType) {
        byType[entryType]++;
      }

      if (oldest === null || entry.createdAt < oldest) {
        oldest = entry.createdAt;
      }
      if (newest === null || entry.createdAt > newest) {
        newest = entry.createdAt;
      }
    }

    return {
      totalEntries: this.cache.size,
      byType,
      oldestEntry: oldest,
      newestEntry: newest,
    };
  }

  /**
   * 簡易的なテキスト類似度計算（Jaccard係数）
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    let intersection = 0;
    for (const word of words1) {
      if (words2.has(word)) {
        intersection++;
      }
    }

    const union = words1.size + words2.size - intersection;
    return union > 0 ? intersection / union : 0;
  }
}

// シングルトンインスタンス
let memoryStoreInstance: MemoryStore | null = null;

/**
 * メモリストアのシングルトンインスタンスを取得
 */
export function getMemoryStore(): MemoryStore {
  if (!memoryStoreInstance) {
    memoryStoreInstance = new MemoryStore();
  }
  return memoryStoreInstance;
}

/**
 * メモリストアをリセット（テスト用）
 */
export function resetMemoryStore(): void {
  memoryStoreInstance = null;
}
