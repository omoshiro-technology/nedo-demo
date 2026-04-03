/**
 * ナレッジリポジトリ
 *
 * ヒューリスティクス、パターン、学習の永続化と検索を担当
 * CQRS: Query（検索）とCommand（保存・更新）を分離
 *
 * 現在の実装: インメモリ
 * 将来: PostgreSQL/MongoDBに置換可能
 */

import type {
  Heuristic,
  DecisionPattern,
} from "../../domain/decisionNavigator/knowledgeBase/types";
import type { Learning } from "../../domain/decisionNavigator/expertThinking/executionResult";

// ============================================================
// インターフェース定義（依存性逆転の原則）
// ============================================================

export interface IKnowledgeRepository {
  // ============================================================
  // Query Operations (CQRS - Read)
  // ============================================================

  /**
   * ドメイン（領域）でヒューリスティクスを検索
   */
  findHeuristicsByDomain(domains: string[]): Heuristic[];

  /**
   * キーワードでヒューリスティクスを検索
   */
  findHeuristicsByKeywords(keywords: string[]): Heuristic[];

  /**
   * 条件に合致するパターンを検索
   */
  findMatchingPatterns(conditions: string[]): DecisionPattern[];

  /**
   * 成功パターンを取得
   */
  findSuccessPatterns(limit?: number): DecisionPattern[];

  /**
   * 失敗パターンを取得
   */
  findFailurePatterns(limit?: number): DecisionPattern[];

  /**
   * コンテキストに関連する学習を検索
   */
  findLearningsByContext(context: string[]): Learning[];

  /**
   * 確認閾値を超えた学習を取得（Heuristic昇格候補）
   */
  findConfirmedLearnings(threshold: number): Learning[];

  /**
   * 全ヒューリスティクスを取得
   */
  getAllHeuristics(): Heuristic[];

  /**
   * 全パターンを取得
   */
  getAllPatterns(): DecisionPattern[];

  // ============================================================
  // Command Operations (CQRS - Write)
  // ============================================================

  /**
   * ヒューリスティクスを保存
   */
  saveHeuristic(heuristic: Heuristic): void;

  /**
   * パターンを保存
   */
  savePattern(pattern: DecisionPattern): void;

  /**
   * 学習を保存
   */
  saveLearning(learning: Learning): void;

  /**
   * ヒューリスティクスの使用統計を更新
   */
  updateHeuristicStats(id: string, wasHelpful: boolean): void;

  /**
   * パターンの発生回数をインクリメント
   */
  incrementPatternOccurrence(id: string): void;

  /**
   * 学習の確認回数をインクリメント
   */
  confirmLearning(id: string): void;

  /**
   * 学習を削除（Heuristic昇格後）
   */
  deleteLearning(id: string): void;

  /**
   * ヒューリスティクスを一括インポート
   */
  importHeuristics(
    heuristics: Heuristic[],
    duplicateHandling: "skip" | "overwrite" | "merge"
  ): { imported: number; skipped: number };

  /**
   * パターンを一括インポート
   */
  importPatterns(
    patterns: DecisionPattern[],
    duplicateHandling: "skip" | "overwrite" | "merge"
  ): { imported: number; skipped: number };

  /**
   * 全データをクリア（テスト用）
   */
  clear(): void;
}

// ============================================================
// インメモリ実装
// ============================================================

export class InMemoryKnowledgeRepository implements IKnowledgeRepository {
  private heuristics: Map<string, Heuristic> = new Map();
  private patterns: Map<string, DecisionPattern> = new Map();
  private learnings: Map<string, Learning> = new Map();

  // ============================================================
  // Query Operations
  // ============================================================

  findHeuristicsByDomain(domains: string[]): Heuristic[] {
    if (domains.length === 0) return [];

    const domainSet = new Set(domains.map((d) => d.toLowerCase()));
    return Array.from(this.heuristics.values()).filter((h) =>
      h.domain.some((d) => domainSet.has(d.toLowerCase()))
    );
  }

  findHeuristicsByKeywords(keywords: string[]): Heuristic[] {
    if (keywords.length === 0) return [];

    const keywordPatterns = keywords.map((k) => k.toLowerCase());
    return Array.from(this.heuristics.values()).filter((h) => {
      const text = `${h.rule} ${h.description}`.toLowerCase();
      return keywordPatterns.some((k) => text.includes(k));
    });
  }

  findMatchingPatterns(conditions: string[]): DecisionPattern[] {
    if (conditions.length === 0) return [];

    const conditionSet = new Set(conditions.map((c) => c.toLowerCase()));
    return Array.from(this.patterns.values()).filter((p) =>
      p.applicableConditions.some((ac) =>
        conditionSet.has(ac.condition.toLowerCase())
      )
    );
  }

  findSuccessPatterns(limit = 10): DecisionPattern[] {
    return Array.from(this.patterns.values())
      .filter((p) => p.type === "success")
      .sort((a, b) => b.reliability - a.reliability)
      .slice(0, limit);
  }

  findFailurePatterns(limit = 10): DecisionPattern[] {
    return Array.from(this.patterns.values())
      .filter((p) => p.type === "failure")
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, limit);
  }

  findLearningsByContext(context: string[]): Learning[] {
    if (context.length === 0) return [];

    const contextPatterns = context.map((c) => c.toLowerCase());
    return Array.from(this.learnings.values()).filter((l) => {
      const text = `${l.content} ${l.applicableConditions.join(" ")}`.toLowerCase();
      return contextPatterns.some((c) => text.includes(c));
    });
  }

  findConfirmedLearnings(threshold: number): Learning[] {
    return Array.from(this.learnings.values()).filter(
      (l) => l.confirmationCount >= threshold
    );
  }

  getAllHeuristics(): Heuristic[] {
    return Array.from(this.heuristics.values());
  }

  getAllPatterns(): DecisionPattern[] {
    return Array.from(this.patterns.values());
  }

  // ============================================================
  // Command Operations
  // ============================================================

  saveHeuristic(heuristic: Heuristic): void {
    this.heuristics.set(heuristic.id, heuristic);
  }

  savePattern(pattern: DecisionPattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  saveLearning(learning: Learning): void {
    this.learnings.set(learning.id, learning);
  }

  updateHeuristicStats(id: string, wasHelpful: boolean): void {
    const heuristic = this.heuristics.get(id);
    if (!heuristic) return;

    heuristic.usageStats.timesApplied++;
    if (wasHelpful) {
      // 成功率を再計算
      const currentSuccesses =
        heuristic.usageStats.successRate * (heuristic.usageStats.timesApplied - 1);
      heuristic.usageStats.successRate =
        (currentSuccesses + 1) / heuristic.usageStats.timesApplied;
    } else {
      const currentSuccesses =
        heuristic.usageStats.successRate * (heuristic.usageStats.timesApplied - 1);
      heuristic.usageStats.successRate =
        currentSuccesses / heuristic.usageStats.timesApplied;
    }

    this.heuristics.set(id, heuristic);
  }

  incrementPatternOccurrence(id: string): void {
    const pattern = this.patterns.get(id);
    if (!pattern) return;

    pattern.occurrences++;
    this.patterns.set(id, pattern);
  }

  confirmLearning(id: string): void {
    const learning = this.learnings.get(id);
    if (!learning) return;

    learning.confirmationCount++;
    this.learnings.set(id, learning);
  }

  deleteLearning(id: string): void {
    this.learnings.delete(id);
  }

  importHeuristics(
    heuristics: Heuristic[],
    duplicateHandling: "skip" | "overwrite" | "merge"
  ): { imported: number; skipped: number } {
    let imported = 0;
    let skipped = 0;

    for (const h of heuristics) {
      const existing = this.heuristics.get(h.id);

      if (existing) {
        switch (duplicateHandling) {
          case "skip":
            skipped++;
            continue;
          case "overwrite":
            this.heuristics.set(h.id, h);
            imported++;
            break;
          case "merge":
            // 統計をマージ
            existing.usageStats.timesApplied += h.usageStats.timesApplied;
            existing.reliability.sampleSize += h.reliability.sampleSize;
            this.heuristics.set(h.id, existing);
            imported++;
            break;
        }
      } else {
        this.heuristics.set(h.id, h);
        imported++;
      }
    }

    return { imported, skipped };
  }

  importPatterns(
    patterns: DecisionPattern[],
    duplicateHandling: "skip" | "overwrite" | "merge"
  ): { imported: number; skipped: number } {
    let imported = 0;
    let skipped = 0;

    for (const p of patterns) {
      const existing = this.patterns.get(p.id);

      if (existing) {
        switch (duplicateHandling) {
          case "skip":
            skipped++;
            continue;
          case "overwrite":
            this.patterns.set(p.id, p);
            imported++;
            break;
          case "merge":
            // 発生回数をマージ
            existing.occurrences += p.occurrences;
            this.patterns.set(p.id, existing);
            imported++;
            break;
        }
      } else {
        this.patterns.set(p.id, p);
        imported++;
      }
    }

    return { imported, skipped };
  }

  clear(): void {
    this.heuristics.clear();
    this.patterns.clear();
    this.learnings.clear();
  }
}

// ============================================================
// シングルトンインスタンス（DI導入前の暫定措置）
// ============================================================

export const KnowledgeRepository: IKnowledgeRepository =
  new InMemoryKnowledgeRepository();
