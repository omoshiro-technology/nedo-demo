"use client"
/**
 * DecisionLandscapeView - 俯瞰ビュー（Decision Landscape View）
 *
 * 森を見る: 全判断軸を同時にカードグリッドで表示
 * - Layer 1: 目的 + 進捗（視座 = 最も高い視点）
 * - Layer 2: 思考パターン別グループ（視野 = 広さ）
 */

import { useMemo, useCallback } from "react";
import type {
  DecisionNavigatorSession,
  ColumnState,
  StrategyGoalDistance,
} from "../../types/decisionNavigator";

type LandscapeCard = {
  criteriaId: string;
  question: string;
  state: "completed" | "active" | "locked";
  selectedOption?: string;
  thinkingPattern?: string;
};

type PatternGroup = {
  pattern: string;
  cards: LandscapeCard[];
  completedCount: number;
  totalCount: number;
};

type DecisionLandscapeViewProps = {
  session: DecisionNavigatorSession;
  onCriteriaClick: (criteriaId: string) => void;
};

const AXIS_LABELS: { key: keyof NonNullable<StrategyGoalDistance["dimensions"]>; label: string }[] = [
  { key: "clarityScore", label: "明確さ" },
  { key: "riskCoverage", label: "リスク" },
  { key: "constraintSatisfaction", label: "制約" },
  { key: "actionReadiness", label: "行動" },
];

function getBarColor(value: number): string {
  if (value >= 70) return "#16a34a";
  if (value >= 40) return "#ca8a04";
  return "#dc2626";
}

export function DecisionLandscapeView({
  session,
  onCriteriaClick,
}: DecisionLandscapeViewProps) {
  // カードデータの構築
  const cards = useMemo<LandscapeCard[]>(() => {
    const criteriaLabels = session.criteriaLabels ?? [];
    const columnStates = session.columnStates ?? [];

    return criteriaLabels.map((criteria, i) => {
      const colState: ColumnState = columnStates[i] ?? "locked";
      const state: LandscapeCard["state"] =
        colState === "completed" ? "completed" :
        colState === "active" ? "active" : "locked";

      // 完了カード: 子のselectedストラテジーのラベルを取得
      let selectedOption: string | undefined;
      if (state === "completed") {
        const selectedChild = session.nodes.find(
          n => n.parentId === criteria.id && n.status === "selected" && n.level === "strategy"
        );
        selectedOption = selectedChild?.label;
      }

      // thinkingPatternを取得（criteriaノードから）
      const criteriaNode = session.nodes.find(n => n.id === criteria.id);
      const thinkingPattern = criteriaNode?.thinkingPattern;

      return {
        criteriaId: criteria.id,
        question: criteria.question,
        state,
        selectedOption,
        thinkingPattern,
      };
    });
  }, [session.criteriaLabels, session.columnStates, session.nodes]);

  // パターン別グルーピング
  const groups = useMemo<PatternGroup[]>(() => {
    const groupMap = new Map<string, LandscapeCard[]>();
    for (const card of cards) {
      const pattern = card.thinkingPattern || "その他";
      const existing = groupMap.get(pattern) ?? [];
      existing.push(card);
      groupMap.set(pattern, existing);
    }

    return Array.from(groupMap.entries()).map(([pattern, groupCards]) => ({
      pattern,
      cards: groupCards,
      completedCount: groupCards.filter(c => c.state === "completed").length,
      totalCount: groupCards.length,
    }));
  }, [cards]);

  // 統計情報
  const stats = useMemo(() => {
    const completed = cards.filter(c => c.state === "completed").length;
    const active = cards.filter(c => c.state === "active").length;
    const locked = cards.filter(c => c.state === "locked").length;
    return { completed, active, locked, total: cards.length };
  }, [cards]);

  const handleCardClick = useCallback((criteriaId: string) => {
    onCriteriaClick(criteriaId);
  }, [onCriteriaClick]);

  return (
    <div className="landscape-view">
      {/* Layer 1: 目的 + 進捗 */}
      <div className="landscape-view__purpose-layer">
        <div className="landscape-view__purpose-header">
          <span className="landscape-view__purpose-icon">🎯</span>
          <span className="landscape-view__purpose-text">{session.purpose}</span>
        </div>
        <div className="landscape-view__stats">
          <span className="landscape-view__stat landscape-view__stat--completed">
            {stats.completed}/{stats.total}完了
          </span>
          {stats.active > 0 && (
            <span className="landscape-view__stat landscape-view__stat--active">
              {stats.active}検討中
            </span>
          )}
          {stats.locked > 0 && (
            <span className="landscape-view__stat landscape-view__stat--locked">
              {stats.locked}未着手
            </span>
          )}
        </div>

        {/* 4軸ミニバー */}
        {session.strategyGoalDistance && (
          <div className="landscape-view__mini-bars">
            {AXIS_LABELS.map(axis => {
              const value = session.strategyGoalDistance!.dimensions[axis.key];
              return (
                <div key={axis.key} className="landscape-view__mini-bar">
                  <span className="landscape-view__mini-bar-label">{axis.label}</span>
                  <div className="landscape-view__mini-bar-track">
                    <div
                      className="landscape-view__mini-bar-fill"
                      style={{ width: `${value}%`, backgroundColor: getBarColor(value) }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Layer 2: 思考パターン別グループ */}
      <div className="landscape-view__groups">
        {groups.map(group => (
          <div key={group.pattern} className="landscape-view__group">
            <div className="landscape-view__group-header">
              <span className="landscape-view__group-name">{group.pattern}</span>
              <span className="landscape-view__group-progress">
                {group.completedCount}/{group.totalCount}
              </span>
            </div>
            <div className="landscape-view__cards">
              {group.cards.map(card => (
                <button
                  key={card.criteriaId}
                  type="button"
                  className={`landscape-card landscape-card--${card.state}`}
                  onClick={() => handleCardClick(card.criteriaId)}
                >
                  <div className="landscape-card__question">{card.question}</div>
                  {card.state === "completed" && card.selectedOption && (
                    <div className="landscape-card__answer">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span dangerouslySetInnerHTML={{ __html: card.selectedOption }} />
                    </div>
                  )}
                  {card.state === "active" && (
                    <div className="landscape-card__status">検討中</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
