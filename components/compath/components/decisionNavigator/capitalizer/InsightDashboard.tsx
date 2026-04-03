"use client"
/**
 * InsightDashboard
 *
 * Capitalizer Agent の知見ダッシュボード
 * - 今週蓄積された知見数
 * - 最も活用された経験則 Top 5
 * - 新規パターン検出の通知
 */

import { useState, useEffect, useCallback } from "react";
import "./InsightDashboard.css";

type Heuristic = {
  id: string;
  rule: string;
  description: string;
  domain: string[];
  reliability: { score: number; sampleSize: number };
  usageStats: { timesApplied: number; successRate: number };
  isActive: boolean;
};

type DecisionPattern = {
  id: string;
  name: string;
  type: "success" | "failure";
  lessons: string[];
  occurrences: number;
  reliability: number;
};

type Learning = {
  id: string;
  category: string;
  content: string;
  confidence: number;
  confirmationCount: number;
  createdAt: string;
};

type InsightDashboardProps = {
  sessionId?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

type KnowledgeStats = {
  totalHeuristics: number;
  totalPatterns: number;
  totalLearnings: number;
  weeklyNewLearnings: number;
  topHeuristics: Heuristic[];
  recentPatterns: DecisionPattern[];
  pendingLearnings: Learning[];
};

export function InsightDashboard({
  sessionId,
  isCollapsed = false,
  onToggleCollapse,
}: InsightDashboardProps) {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "heuristics" | "patterns" | "learnings">("overview");

  // 知見統計を取得
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/decision-navigator/knowledge/stats${sessionId ? `?sessionId=${sessionId}` : ""}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          // API未実装の場合はモックデータを使用
          setStats(getMockStats());
        }
      } catch (error) {
        console.warn("[InsightDashboard] Failed to fetch stats, using mock data:", error);
        setStats(getMockStats());
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [sessionId]);

  // モックデータ（API未実装時のフォールバック）
  const getMockStats = (): KnowledgeStats => ({
    totalHeuristics: 12,
    totalPatterns: 8,
    totalLearnings: 25,
    weeklyNewLearnings: 5,
    topHeuristics: [
      {
        id: "h1",
        rule: "IF 安全性に懸念 THEN リスク回避戦略を選択",
        description: "安全性が最優先される製造業の基本原則",
        domain: ["safety", "manufacturing"],
        reliability: { score: 92, sampleSize: 15 },
        usageStats: { timesApplied: 28, successRate: 0.85 },
        isActive: true,
      },
      {
        id: "h2",
        rule: "IF 納期が厳しい THEN 並列作業を検討",
        description: "時間制約下での効率化手法",
        domain: ["delivery", "planning"],
        reliability: { score: 78, sampleSize: 8 },
        usageStats: { timesApplied: 12, successRate: 0.75 },
        isActive: true,
      },
    ],
    recentPatterns: [
      {
        id: "p1",
        name: "コスト削減の成功パターン",
        type: "success",
        lessons: ["事前の要件定義が重要", "複数の選択肢を比較検討"],
        occurrences: 5,
        reliability: 80,
      },
    ],
    pendingLearnings: [
      {
        id: "l1",
        category: "heuristic",
        content: "設備投資では保全性も考慮すべき",
        confidence: 75,
        confirmationCount: 2,
        createdAt: new Date().toISOString(),
      },
    ],
  });

  if (isCollapsed) {
    return (
      <div className="id-collapsed" onClick={onToggleCollapse}>
        <div className="id-collapsed__icon">💡</div>
        <div className="id-collapsed__count">
          {stats?.weeklyNewLearnings ?? 0}
        </div>
      </div>
    );
  }

  return (
    <div className="id-container">
      {/* ヘッダー */}
      <div className="id-header">
        <div className="id-header__left">
          <span className="id-header__icon">💡</span>
          <span className="id-header__title">Capitalizer Agent</span>
          <span className="id-header__subtitle">蓄積された知見</span>
        </div>
        {onToggleCollapse && (
          <button
            className="id-header__collapse"
            onClick={onToggleCollapse}
            aria-label="折りたたむ"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>

      {/* ローディング */}
      {isLoading && (
        <div className="id-loading">
          <div className="id-loading__spinner" />
          <span>知見を読み込み中...</span>
        </div>
      )}

      {/* コンテンツ */}
      {!isLoading && stats && (
        <>
          {/* 概要カード */}
          <div className="id-overview">
            <div className="id-stat-card">
              <div className="id-stat-card__value">{stats.totalHeuristics}</div>
              <div className="id-stat-card__label">経験則</div>
            </div>
            <div className="id-stat-card">
              <div className="id-stat-card__value">{stats.totalPatterns}</div>
              <div className="id-stat-card__label">パターン</div>
            </div>
            <div className="id-stat-card id-stat-card--highlight">
              <div className="id-stat-card__value">+{stats.weeklyNewLearnings}</div>
              <div className="id-stat-card__label">今週の学び</div>
            </div>
          </div>

          {/* タブ */}
          <div className="id-tabs">
            <button
              className={`id-tab ${activeTab === "overview" ? "id-tab--active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              概要
            </button>
            <button
              className={`id-tab ${activeTab === "heuristics" ? "id-tab--active" : ""}`}
              onClick={() => setActiveTab("heuristics")}
            >
              経験則
            </button>
            <button
              className={`id-tab ${activeTab === "patterns" ? "id-tab--active" : ""}`}
              onClick={() => setActiveTab("patterns")}
            >
              パターン
            </button>
            <button
              className={`id-tab ${activeTab === "learnings" ? "id-tab--active" : ""}`}
              onClick={() => setActiveTab("learnings")}
            >
              学び
            </button>
          </div>

          {/* タブコンテンツ */}
          <div className="id-content">
            {activeTab === "overview" && (
              <OverviewTab stats={stats} />
            )}
            {activeTab === "heuristics" && (
              <HeuristicsTab heuristics={stats.topHeuristics} />
            )}
            {activeTab === "patterns" && (
              <PatternsTab patterns={stats.recentPatterns} />
            )}
            {activeTab === "learnings" && (
              <LearningsTab learnings={stats.pendingLearnings} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// タブコンポーネント
// ============================================================

function OverviewTab({ stats }: { stats: KnowledgeStats }) {
  return (
    <div className="id-overview-tab">
      <h4 className="id-section-title">活用度の高い経験則 Top 3</h4>
      <div className="id-top-list">
        {stats.topHeuristics.slice(0, 3).map((h, index) => (
          <div key={h.id} className="id-top-item">
            <span className="id-top-item__rank">{index + 1}</span>
            <div className="id-top-item__content">
              <p className="id-top-item__rule">{h.rule}</p>
              <div className="id-top-item__stats">
                <span>適用 {h.usageStats.timesApplied}回</span>
                <span>成功率 {Math.round(h.usageStats.successRate * 100)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {stats.pendingLearnings.length > 0 && (
        <>
          <h4 className="id-section-title">昇格待ちの学び</h4>
          <div className="id-pending-list">
            {stats.pendingLearnings.slice(0, 2).map((l) => (
              <div key={l.id} className="id-pending-item">
                <span className="id-pending-item__badge">
                  確認 {l.confirmationCount}/3
                </span>
                <p className="id-pending-item__content">{l.content}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HeuristicsTab({ heuristics }: { heuristics: Heuristic[] }) {
  return (
    <div className="id-heuristics-tab">
      {heuristics.length === 0 ? (
        <p className="id-empty">まだ経験則が蓄積されていません</p>
      ) : (
        <div className="id-heuristic-list">
          {heuristics.map((h) => (
            <div key={h.id} className="id-heuristic-card">
              <div className="id-heuristic-card__header">
                <span className="id-heuristic-card__reliability">
                  信頼度 {h.reliability.score}%
                </span>
                {h.isActive && (
                  <span className="id-heuristic-card__active">有効</span>
                )}
              </div>
              <p className="id-heuristic-card__rule">{h.rule}</p>
              <p className="id-heuristic-card__desc">{h.description}</p>
              <div className="id-heuristic-card__domains">
                {h.domain.map((d) => (
                  <span key={d} className="id-heuristic-card__domain">{d}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PatternsTab({ patterns }: { patterns: DecisionPattern[] }) {
  return (
    <div className="id-patterns-tab">
      {patterns.length === 0 ? (
        <p className="id-empty">まだパターンが検出されていません</p>
      ) : (
        <div className="id-pattern-list">
          {patterns.map((p) => (
            <div
              key={p.id}
              className={`id-pattern-card ${p.type === "success" ? "id-pattern-card--success" : "id-pattern-card--failure"}`}
            >
              <div className="id-pattern-card__header">
                <span className="id-pattern-card__type">
                  {p.type === "success" ? "成功" : "失敗"}パターン
                </span>
                <span className="id-pattern-card__occurrences">
                  {p.occurrences}回
                </span>
              </div>
              <p className="id-pattern-card__name">{p.name}</p>
              <ul className="id-pattern-card__lessons">
                {p.lessons.slice(0, 2).map((lesson, i) => (
                  <li key={i}>{lesson}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LearningsTab({ learnings }: { learnings: Learning[] }) {
  return (
    <div className="id-learnings-tab">
      {learnings.length === 0 ? (
        <p className="id-empty">まだ学びが蓄積されていません</p>
      ) : (
        <div className="id-learning-list">
          {learnings.map((l) => (
            <div key={l.id} className="id-learning-card">
              <div className="id-learning-card__header">
                <span className={`id-learning-card__category id-learning-card__category--${l.category}`}>
                  {l.category === "heuristic" ? "経験則候補" : "インサイト"}
                </span>
                <span className="id-learning-card__confidence">
                  信頼度 {l.confidence}%
                </span>
              </div>
              <p className="id-learning-card__content">{l.content}</p>
              <div className="id-learning-card__footer">
                <span className="id-learning-card__confirmation">
                  確認回数: {l.confirmationCount}
                  {l.confirmationCount >= 3 && " (昇格可能)"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
