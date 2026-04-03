"use client"
/**
 * DecisionJourneyView - 意思決定履歴の可視化
 *
 * Phase 27: ユーザーが選択した判断のパスと内容を構造化表示
 * - 目的達成のために行った判断内容を一覧表示
 * - 「なぜその結論に至ったか」のストーリーを可視化
 */

import { memo, useMemo } from "react";
import type {
  DecisionJourneyData,
  DecisionJourneyStep,
  DecisionNavigatorSession,
  RiskStrategy,
} from "../../types/decisionNavigator";

type DecisionJourneyViewProps = {
  session: DecisionNavigatorSession;
  onClose?: () => void;
};

/**
 * セッションからDecisionJourneyDataを構築
 *
 * 選択されたノード（status === "selected"）から判断パスを構築
 * selectionHistoryに依存せず、実際のノードステータスを参照することで
 * ノード選択時に即座に反映される
 */
function buildJourneyData(session: DecisionNavigatorSession): DecisionJourneyData {
  const steps: DecisionJourneyStep[] = [];

  // 判断軸マップを構築
  const criteriaMap = new Map(
    (session.criteriaLabels || []).map((c) => [c.id, c])
  );

  // 選択されたノード（選択済み）を抽出
  // 注: "recommended"は推奨状態であり、まだ選択されていない
  // "selected"のみが実際に選択されたノード
  // スタートノード（type === "start"）は目的であり判断ではないため除外
  const selectedNodes = session.nodes.filter(
    (n) => n.status === "selected" && n.type !== "start"
  );

  // criteriaLabelsの順序に基づいてソート（判断軸の順番で表示）
  const criteriaOrder = new Map(
    (session.criteriaLabels || []).map((c, i) => [c.id, i])
  );

  selectedNodes.sort((a, b) => {
    const orderA = criteriaOrder.get(a.parentId || "") ?? 999;
    const orderB = criteriaOrder.get(b.parentId || "") ?? 999;
    return orderA - orderB;
  });

  // 選択されたノードからステップを生成
  selectedNodes.forEach((node, index) => {
    // 親の判断軸（問い）を取得
    const criteria = criteriaMap.get(node.parentId || "");
    const parentNode = session.nodes.find((n) => n.id === node.parentId);

    // selectionHistoryから理由を取得（あれば）
    const historyEntry = session.selectionHistory.find(
      (h) => h.nodeId === node.id
    );

    steps.push({
      order: index + 1,
      criteriaId: node.id,
      criteriaLabel: criteria?.question || parentNode?.label || "判断軸",
      selectedOption: node.label,
      rationale: historyEntry?.rationale || node.expertThinking?.rationale,
      riskStrategy: node.expertThinking?.riskStrategy,
      riskLevel: node.expertThinking?.riskLevel,
      timestamp: historyEntry?.selectedAt || session.updatedAt,
    });
  });

  // サマリーを計算
  const riskHedgeCount = steps.filter(
    (s) => s.riskStrategy === "avoid" || s.riskStrategy === "mitigate"
  ).length;
  const riskTakeCount = steps.filter(
    (s) => s.riskStrategy === "accept"
  ).length;

  // 主要な考慮点を抽出（理由から頻出キーワードを抽出）
  const primaryConsiderations: string[] = [];
  const rationaleText = steps
    .map((s) => s.rationale)
    .filter(Boolean)
    .join(" ");
  if (rationaleText.includes("安定") || rationaleText.includes("運転")) {
    primaryConsiderations.push("安定運転");
  }
  if (rationaleText.includes("コスト") || rationaleText.includes("費用")) {
    primaryConsiderations.push("コスト");
  }
  if (rationaleText.includes("安全") || rationaleText.includes("リスク")) {
    primaryConsiderations.push("安全性");
  }
  if (primaryConsiderations.length === 0 && steps.length > 0) {
    primaryConsiderations.push("総合判断");
  }

  return {
    purpose: session.purpose,
    steps,
    summary: {
      totalSteps: steps.length,
      riskHedgeCount,
      riskTakeCount,
      primaryConsiderations,
    },
    outcome: session.conclusion,
    createdAt: session.createdAt,
    completedAt: session.completedAt,
  };
}

/**
 * リスク戦略のラベルと色を取得
 */
function getRiskStrategyInfo(strategy?: RiskStrategy): {
  label: string;
  className: string;
} {
  switch (strategy) {
    case "avoid":
      return { label: "回避", className: "journey-step__risk--avoid" };
    case "mitigate":
      return { label: "軽減", className: "journey-step__risk--mitigate" };
    case "transfer":
      return { label: "転嫁", className: "journey-step__risk--transfer" };
    case "accept":
      return { label: "受容", className: "journey-step__risk--accept" };
    default:
      return { label: "", className: "" };
  }
}

/**
 * 判断ステップの表示コンポーネント
 */
const JourneyStep = memo(function JourneyStep({
  step,
  isLast,
}: {
  step: DecisionJourneyStep;
  isLast: boolean;
}) {
  const riskInfo = getRiskStrategyInfo(step.riskStrategy);

  return (
    <div className="journey-step">
      {/* ステップインジケーター */}
      <div className="journey-step__indicator">
        <span className="journey-step__number">{step.order}</span>
        {!isLast && <div className="journey-step__line" />}
      </div>

      {/* ステップ内容 */}
      <div className="journey-step__content">
        {/* 判断軸（問い） */}
        <div className="journey-step__criteria">{step.criteriaLabel}</div>

        {/* 選択内容 */}
        <div className="journey-step__selection">
          <span className="journey-step__selection-label">選択:</span>
          <span className="journey-step__selection-value">
            {step.selectedOption}
          </span>
        </div>

        {/* 判断理由 */}
        {step.rationale && (
          <div className="journey-step__rationale">
            <span className="journey-step__rationale-icon">💡</span>
            <span>{step.rationale}</span>
          </div>
        )}

        {/* リスク戦略バッジ */}
        {step.riskStrategy && (
          <div className={`journey-step__risk ${riskInfo.className}`}>
            リスク戦略: {riskInfo.label}
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * メインコンポーネント
 */
function DecisionJourneyViewComponent({
  session,
  onClose,
}: DecisionJourneyViewProps) {
  const journeyData = useMemo(() => buildJourneyData(session), [session]);

  if (journeyData.steps.length === 0) {
    return (
      <div className="decision-journey decision-journey--empty">
        <div className="decision-journey__header">
          <h3 className="decision-journey__title">判断履歴</h3>
          {onClose && (
            <button
              type="button"
              className="decision-journey__close"
              onClick={onClose}
            >
              ✕
            </button>
          )}
        </div>
        <div className="decision-journey__empty-message">
          まだ判断が記録されていません
        </div>
      </div>
    );
  }

  return (
    <div className="decision-journey">
      {/* ヘッダー */}
      <div className="decision-journey__header">
        <div className="decision-journey__header-content">
          <h3 className="decision-journey__title">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            目的達成までの判断パス
          </h3>
          <p className="decision-journey__purpose">{journeyData.purpose}</p>
        </div>
        {onClose && (
          <button
            type="button"
            className="decision-journey__close"
            onClick={onClose}
          >
            ✕
          </button>
        )}
      </div>

      {/* 判断ステップリスト */}
      <div className="decision-journey__steps">
        {journeyData.steps.map((step, index) => (
          <JourneyStep
            key={step.criteriaId}
            step={step}
            isLast={index === journeyData.steps.length - 1}
          />
        ))}
      </div>

      {/* 最終結果 */}
      {journeyData.outcome && (
        <div className="decision-journey__outcome">
          <div className="decision-journey__outcome-label">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>最終結論</span>
          </div>
          <p className="decision-journey__outcome-value">{journeyData.outcome}</p>
        </div>
      )}

      {/* サマリー */}
      <div className="decision-journey__summary">
        <div className="decision-journey__summary-item">
          <span className="decision-journey__summary-label">判断数</span>
          <span className="decision-journey__summary-value">
            {journeyData.summary.totalSteps}件
          </span>
        </div>
        {journeyData.summary.riskHedgeCount > 0 && (
          <div className="decision-journey__summary-item">
            <span className="decision-journey__summary-label">リスクヘッジ</span>
            <span className="decision-journey__summary-value decision-journey__summary-value--hedge">
              {journeyData.summary.riskHedgeCount}件
            </span>
          </div>
        )}
        {journeyData.summary.riskTakeCount > 0 && (
          <div className="decision-journey__summary-item">
            <span className="decision-journey__summary-label">リスクテイク</span>
            <span className="decision-journey__summary-value decision-journey__summary-value--take">
              {journeyData.summary.riskTakeCount}件
            </span>
          </div>
        )}
        {journeyData.summary.primaryConsiderations.length > 0 && (
          <div className="decision-journey__summary-item decision-journey__summary-item--considerations">
            <span className="decision-journey__summary-label">主要考慮点</span>
            <span className="decision-journey__summary-value">
              {journeyData.summary.primaryConsiderations.join("、")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export const DecisionJourneyView = memo(DecisionJourneyViewComponent);
