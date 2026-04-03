"use client"
/**
 * RouteRiskSummary
 *
 * ルート完了時のリスクサマリー表示
 * - 選択したパス全体のリスクヘッジ/リスクテイクを可視化
 * - 終端ノード到達時に表示
 */

import { useMemo } from "react";
import type { DecisionFlowNode, SelectionHistoryEntry } from "../../../types/decisionNavigator";
import "./RouteRiskSummary.css";

type RouteRiskSummaryProps = {
  /** セッションの全ノード */
  nodes: DecisionFlowNode[];
  /** 選択履歴 */
  selectionHistory: SelectionHistoryEntry[];
  /** 目的 */
  purpose: string;
  /** 閉じるコールバック */
  onClose: () => void;
};

/** リスク戦略のラベル */
const RISK_STRATEGY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  avoid: { label: "回避", icon: "🛡️", color: "#22c55e" },
  mitigate: { label: "軽減", icon: "⚖️", color: "#3b82f6" },
  transfer: { label: "転嫁", icon: "🔄", color: "#8b5cf6" },
  accept: { label: "受容", icon: "✅", color: "#f59e0b" },
};

/** リスクレベルのラベル */
const RISK_LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "低", color: "#22c55e" },
  medium: { label: "中", color: "#f59e0b" },
  high: { label: "高", color: "#ef4444" },
  critical: { label: "重大", color: "#dc2626" },
};

export function RouteRiskSummary({
  nodes,
  selectionHistory,
  purpose,
  onClose,
}: RouteRiskSummaryProps) {
  // 選択されたノードを取得
  const selectedNodes = useMemo(() => {
    const selectedNodeIds = new Set(selectionHistory.map((h) => h.nodeId));
    return nodes.filter((n) => selectedNodeIds.has(n.id) || n.status === "selected");
  }, [nodes, selectionHistory]);

  // リスク戦略の集計
  const riskStrategySummary = useMemo(() => {
    const summary: Record<string, { count: number; nodes: DecisionFlowNode[] }> = {};
    selectedNodes.forEach((node) => {
      if (node.riskStrategy) {
        if (!summary[node.riskStrategy]) {
          summary[node.riskStrategy] = { count: 0, nodes: [] };
        }
        summary[node.riskStrategy].count++;
        summary[node.riskStrategy].nodes.push(node);
      }
    });
    return summary;
  }, [selectedNodes]);

  // リスクレベルの集計
  const riskLevelSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    selectedNodes.forEach((node) => {
      if (node.riskLevel) {
        summary[node.riskLevel] = (summary[node.riskLevel] || 0) + 1;
      }
    });
    return summary;
  }, [selectedNodes]);

  // リスクヘッジ（回避・軽減・転嫁）とリスクテイク（受容）に分類
  const riskHedgeNodes = useMemo(() => {
    return selectedNodes.filter((n) =>
      n.riskStrategy === "avoid" ||
      n.riskStrategy === "mitigate" ||
      n.riskStrategy === "transfer"
    );
  }, [selectedNodes]);

  const riskTakeNodes = useMemo(() => {
    return selectedNodes.filter((n) => n.riskStrategy === "accept");
  }, [selectedNodes]);

  // リスク詳細の抽出
  const riskDetails = useMemo(() => {
    return selectedNodes
      .filter((n) => n.riskDetail)
      .map((n) => ({
        nodeLabel: n.label,
        ...n.riskDetail!,
      }));
  }, [selectedNodes]);

  return (
    <div className="rrs-overlay" onClick={onClose}>
      <div className="rrs-modal" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="rrs-header">
          <div className="rrs-header__left">
            <span className="rrs-header__icon">📊</span>
            <span className="rrs-header__title">ルートリスクサマリー</span>
          </div>
          <button className="rrs-close-btn" onClick={onClose} aria-label="閉じる">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 目的表示 */}
        <div className="rrs-purpose">
          <span className="rrs-purpose__label">目的:</span>
          <span className="rrs-purpose__text">{purpose}</span>
        </div>

        {/* サマリーカード */}
        <div className="rrs-summary-cards">
          {/* リスクヘッジ */}
          <div className="rrs-card rrs-card--hedge">
            <div className="rrs-card__header">
              <span className="rrs-card__icon">🛡️</span>
              <span className="rrs-card__title">リスクヘッジ</span>
              <span className="rrs-card__count">{riskHedgeNodes.length}件</span>
            </div>
            <div className="rrs-card__body">
              {riskHedgeNodes.length === 0 ? (
                <p className="rrs-card__empty">リスク回避・軽減の選択なし</p>
              ) : (
                <ul className="rrs-card__list">
                  {riskHedgeNodes.map((node) => (
                    <li key={node.id} className="rrs-card__item">
                      <span
                        className="rrs-card__strategy-badge"
                        style={{ backgroundColor: RISK_STRATEGY_LABELS[node.riskStrategy!]?.color || "#6b7280" }}
                      >
                        {RISK_STRATEGY_LABELS[node.riskStrategy!]?.icon || "•"} {RISK_STRATEGY_LABELS[node.riskStrategy!]?.label || node.riskStrategy}
                      </span>
                      <span className="rrs-card__node-label">{node.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* リスクテイク */}
          <div className="rrs-card rrs-card--take">
            <div className="rrs-card__header">
              <span className="rrs-card__icon">⚡</span>
              <span className="rrs-card__title">リスクテイク</span>
              <span className="rrs-card__count">{riskTakeNodes.length}件</span>
            </div>
            <div className="rrs-card__body">
              {riskTakeNodes.length === 0 ? (
                <p className="rrs-card__empty">リスク受容の選択なし</p>
              ) : (
                <ul className="rrs-card__list">
                  {riskTakeNodes.map((node) => (
                    <li key={node.id} className="rrs-card__item">
                      <span
                        className="rrs-card__strategy-badge"
                        style={{ backgroundColor: RISK_STRATEGY_LABELS.accept.color }}
                      >
                        {RISK_STRATEGY_LABELS.accept.icon} {RISK_STRATEGY_LABELS.accept.label}
                      </span>
                      <span className="rrs-card__node-label">{node.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* リスクレベル分布 */}
        <div className="rrs-distribution">
          <h3 className="rrs-distribution__title">リスクレベル分布</h3>
          <div className="rrs-distribution__bars">
            {Object.entries(RISK_LEVEL_LABELS).map(([level, config]) => {
              const count = riskLevelSummary[level] || 0;
              const percentage = selectedNodes.length > 0
                ? (count / selectedNodes.length) * 100
                : 0;
              return (
                <div key={level} className="rrs-distribution__bar-container">
                  <div className="rrs-distribution__bar-label">
                    <span style={{ color: config.color }}>{config.label}</span>
                    <span className="rrs-distribution__bar-count">{count}</span>
                  </div>
                  <div className="rrs-distribution__bar-bg">
                    <div
                      className="rrs-distribution__bar-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: config.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* リスク詳細 */}
        {riskDetails.length > 0 && (
          <div className="rrs-details">
            <h3 className="rrs-details__title">リスク詳細</h3>
            <div className="rrs-details__list">
              {riskDetails.map((detail, index) => (
                <div key={index} className="rrs-details__item">
                  <div className="rrs-details__item-header">
                    <span className="rrs-details__node-label">{detail.nodeLabel}</span>
                  </div>
                  <div className="rrs-details__item-body">
                    <p className="rrs-details__target">
                      <strong>対象リスク:</strong> {detail.targetRisk}
                    </p>
                    <p className="rrs-details__help">
                      <strong>対策効果:</strong> {detail.howThisHelps}
                    </p>
                    {detail.residualRisk && (
                      <p className="rrs-details__residual">
                        <strong>残存リスク:</strong> {detail.residualRisk}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* フッター */}
        <div className="rrs-footer">
          <p className="rrs-footer__note">
            選択されたルートは {selectedNodes.length} 件の意思決定で構成されています。
          </p>
          <button className="rrs-btn rrs-btn--primary" onClick={onClose}>
            確認して閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
