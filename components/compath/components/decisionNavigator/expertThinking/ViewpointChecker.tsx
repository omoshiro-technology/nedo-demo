"use client"
/**
 * ViewpointChecker
 *
 * 観点（View）のチェックリストを表示するコンポーネント
 * - 見落としやすい観点には警告を表示
 * - QCDESなどのカテゴリ別に整理
 */

import { useState } from "react";
import type { DecisionViewpoint } from "../../../types/decisionNavigator";

type ViewpointCheckerProps = {
  viewpoints: DecisionViewpoint[];
  onCheckpointToggle?: (viewpointName: string, checkpointIndex: number, checked: boolean) => void;
};

/** カテゴリのラベル */
const CATEGORY_LABELS: Record<string, string> = {
  qcdes: "QCDES",
  stakeholder: "ステークホルダー",
  temporal: "時間軸",
  risk: "リスク",
  value: "価値",
};

/** QCDESサブカテゴリのラベル */
const QCDES_LABELS: Record<string, { label: string; icon: string }> = {
  quality: { label: "品質", icon: "Q" },
  cost: { label: "コスト", icon: "C" },
  delivery: { label: "納期", icon: "D" },
  environment: { label: "環境", icon: "E" },
  safety: { label: "安全", icon: "S" },
};

/** 評価スコアに基づく色クラスを取得 */
function getScoreColorClass(score: number): string {
  if (score >= 50) return "vp-checker__score--positive";
  if (score <= -50) return "vp-checker__score--negative";
  if (score > 0) return "vp-checker__score--slightly-positive";
  if (score < 0) return "vp-checker__score--slightly-negative";
  return "vp-checker__score--neutral";
}

export function ViewpointChecker({ viewpoints, onCheckpointToggle }: ViewpointCheckerProps) {
  const [expandedViewpoints, setExpandedViewpoints] = useState<Set<string>>(new Set());

  const toggleExpand = (name: string) => {
    setExpandedViewpoints((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // カテゴリごとにグループ化
  const groupedViewpoints = viewpoints.reduce(
    (acc, vp) => {
      const category = vp.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(vp);
      return acc;
    },
    {} as Record<string, DecisionViewpoint[]>
  );

  // 見落としやすい観点を先に表示するようソート
  const sortedCategories = Object.keys(groupedViewpoints).sort((a, b) => {
    const aHasOverlooked = groupedViewpoints[a].some((v) => v.isOftenOverlooked);
    const bHasOverlooked = groupedViewpoints[b].some((v) => v.isOftenOverlooked);
    if (aHasOverlooked && !bHasOverlooked) return -1;
    if (!aHasOverlooked && bHasOverlooked) return 1;
    return 0;
  });

  return (
    <div className="vp-checker">
      {sortedCategories.map((category) => (
        <div key={category} className="vp-checker__category">
          <div className="vp-checker__category-header">
            <span className="vp-checker__category-label">
              {CATEGORY_LABELS[category] || category}
            </span>
            {groupedViewpoints[category].some((v) => v.isOftenOverlooked) && (
              <span className="vp-checker__overlooked-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6z" />
                </svg>
                要注意
              </span>
            )}
          </div>

          <div className="vp-checker__viewpoints">
            {groupedViewpoints[category].map((viewpoint) => {
              const isExpanded = expandedViewpoints.has(viewpoint.name);
              const hasCheckpoints = viewpoint.checkpoints && viewpoint.checkpoints.length > 0;

              return (
                <div
                  key={viewpoint.name}
                  className={`vp-checker__viewpoint ${viewpoint.isOftenOverlooked ? "vp-checker__viewpoint--overlooked" : ""}`}
                >
                  {/* ヘッダー */}
                  <div
                    className="vp-checker__viewpoint-header"
                    onClick={() => hasCheckpoints && toggleExpand(viewpoint.name)}
                  >
                    <div className="vp-checker__viewpoint-left">
                      {viewpoint.isOftenOverlooked && (
                        <span className="vp-checker__warning-icon" title="見落としやすい観点">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-8h-2v6h2V8z" />
                          </svg>
                        </span>
                      )}
                      {viewpoint.category === "qcdes" && viewpoint.qcdesType && (
                        <span className={`vp-checker__qcdes-badge vp-checker__qcdes-badge--${viewpoint.qcdesType}`}>
                          {QCDES_LABELS[viewpoint.qcdesType]?.icon || viewpoint.qcdesType}
                        </span>
                      )}
                      <span className="vp-checker__viewpoint-name">{viewpoint.name}</span>
                    </div>

                    <div className="vp-checker__viewpoint-right">
                      {/* 評価スコア */}
                      <span className={`vp-checker__score ${getScoreColorClass(viewpoint.evaluation.score)}`}>
                        {viewpoint.evaluation.score > 0 ? "+" : ""}
                        {viewpoint.evaluation.score}
                      </span>

                      {hasCheckpoints && (
                        <svg
                          className={`vp-checker__expand-icon ${isExpanded ? "vp-checker__expand-icon--expanded" : ""}`}
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* 詳細 */}
                  <div className="vp-checker__viewpoint-body">
                    <p className="vp-checker__perspective">{viewpoint.perspective}</p>
                    <p className="vp-checker__evaluation-comment">{viewpoint.evaluation.comment}</p>

                    {/* 見落としリスク */}
                    {viewpoint.isOftenOverlooked && viewpoint.overlookedRisk && (
                      <div className="vp-checker__overlooked-risk">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 8v4M12 16h.01" />
                        </svg>
                        <span>{viewpoint.overlookedRisk}</span>
                      </div>
                    )}
                  </div>

                  {/* チェックポイント（展開時） */}
                  {isExpanded && hasCheckpoints && (
                    <div className="vp-checker__checkpoints">
                      <h6 className="vp-checker__checkpoints-title">確認ポイント</h6>
                      <ul className="vp-checker__checkpoint-list">
                        {viewpoint.checkpoints!.map((checkpoint, index) => (
                          <li key={index} className="vp-checker__checkpoint">
                            <label className="vp-checker__checkpoint-label">
                              <input
                                type="checkbox"
                                className="vp-checker__checkpoint-checkbox"
                                onChange={(e) =>
                                  onCheckpointToggle?.(viewpoint.name, index, e.target.checked)
                                }
                              />
                              <span className="vp-checker__checkpoint-text">{checkpoint}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
