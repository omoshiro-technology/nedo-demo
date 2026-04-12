"use client"
/**
 * ノード選択ポップオーバー
 * - ノードの近くに表示される軽量なポップオーバー
 * - 選択理由のプリセットチップとカスタム入力
 * - 視線移動を最小限に抑える
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  DecisionFlowNode,
  StructuredRecommendationRationale,
  RecommendationRationaleType,
  ImpactAssessment,
} from "../../types/decisionNavigator";

type NodePopoverProps = {
  node: DecisionFlowNode | null;
  isOpen: boolean;
  /** ノードのスクリーン座標（ReactFlowのprojectで変換済み） */
  position: { x: number; y: number } | null;
  onClose: () => void;
  onSelect: (nodeId: string, rationale?: string) => void;
  /** 編集モード（選択済みノードの理由を変更する場合） */
  isEditing?: boolean;
  /** 編集モード時の既存の理由 */
  existingRationale?: string;
  /** 理由更新時のコールバック（編集モード用） */
  onUpdateRationale?: (nodeId: string, rationale?: string) => void;
};

/** 根拠タイプのラベル */
const RATIONALE_TYPE_LABELS: Record<RecommendationRationaleType, string> = {
  pmbok_risk: "PMBOKリスク戦略",
  business_value: "ビジネス観点",
  context_fit: "文脈適合",
  past_case: "過去事例",
};

/**
 * デフォルトプリセット（バックエンドからプリセットが来ない場合のフォールバック）
 */
export const DEFAULT_RATIONALE_PRESETS = [
  { id: "quality", label: "品質確保", category: "qcdes" as const, priority: 80 },
  { id: "cost", label: "コスト最適", category: "qcdes" as const, priority: 70 },
  { id: "delivery", label: "納期遵守", category: "qcdes" as const, priority: 75 },
  { id: "safety", label: "安全確保", category: "qcdes" as const, priority: 90 },
];

export function NodePopover({
  node,
  isOpen,
  position,
  onClose,
  onSelect,
  isEditing = false,
  existingRationale,
  onUpdateRationale,
}: NodePopoverProps) {
  const [selectedRationales, setSelectedRationales] = useState<string[]>([]);
  const [customRationale, setCustomRationale] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  // ポップオーバー外クリックで閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // 少し遅延させて、クリックイベントの伝播を待つ
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ノードが変わったらリセット、または編集モード時は既存値を復元
  useEffect(() => {
    if (!node) {
      setSelectedRationales([]);
      setCustomRationale("");
      return;
    }

    if (isEditing && existingRationale) {
      // 既存の理由からプリセットを復元
      const presets = node.rationalePresets ?? DEFAULT_RATIONALE_PRESETS;
      const parts = existingRationale.split("・");

      const matchedIds: string[] = [];
      const customParts: string[] = [];

      for (const part of parts) {
        const matchedPreset = presets.find((p) => p.label === part);
        if (matchedPreset) {
          matchedIds.push(matchedPreset.id);
        } else if (part.trim()) {
          customParts.push(part.trim());
        }
      }

      setSelectedRationales(matchedIds);
      setCustomRationale(customParts.join("・"));
    } else {
      setSelectedRationales([]);
      setCustomRationale("");
    }
  }, [node?.id, isEditing, existingRationale, node?.rationalePresets]);

  const handleRationaleToggle = useCallback((id: string) => {
    setSelectedRationales((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }, []);

  const handleSubmit = useCallback(() => {
    if (!node) return;

    const presets = node.rationalePresets ?? DEFAULT_RATIONALE_PRESETS;

    const rationaleLabels = selectedRationales
      .map((id) => presets.find((p) => p.id === id)?.label)
      .filter(Boolean);

    if (customRationale.trim()) {
      rationaleLabels.push(customRationale.trim());
    }

    const rationale = rationaleLabels.length > 0 ? rationaleLabels.join("・") : undefined;

    // 編集モードの場合は更新、新規選択の場合は選択
    if (isEditing && onUpdateRationale) {
      onUpdateRationale(node.id, rationale);
    } else {
      onSelect(node.id, rationale);
    }

    setSelectedRationales([]);
    setCustomRationale("");
  }, [node, selectedRationales, customRationale, onSelect, isEditing, onUpdateRationale]);

  // Escキーで閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!node || !isOpen || !position) return null;

  // ポップオーバーの位置を計算（ノードの右側に表示、画面端の場合は調整）
  const popoverWidth = 480;
  const popoverHeight = 400;
  const margin = 16;

  let left = position.x + margin;
  let top = position.y - popoverHeight / 2;

  // 右端にはみ出る場合は左側に表示
  if (left + popoverWidth > window.innerWidth - margin) {
    left = position.x - popoverWidth - margin;
  }

  // 上端にはみ出る場合
  if (top < margin) {
    top = margin;
  }

  // 下端にはみ出る場合
  if (top + popoverHeight > window.innerHeight - margin) {
    top = window.innerHeight - popoverHeight - margin;
  }

  const presets = node.rationalePresets ?? DEFAULT_RATIONALE_PRESETS;

  // リスク情報の有無を判定
  const hasRiskInfo = node.riskDetail || node.riskStrategy || node.riskLevel ||
    (node.structuredRationale?.qcdesImpact &&
      Object.values(node.structuredRationale.qcdesImpact).some(v => v?.impact === "negative"));

  // サマリーの有無
  const summary = node.structuredRationale?.summary || node.recommendationReason;

  return (
    <div
      ref={popoverRef}
      className="dn-popover dn-popover--structured"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${popoverWidth}px`,
      }}
    >
      {/* ヘッダー */}
      <div className="dn-popover__header">
        <div className="dn-popover__title-row">
          <h4 className="dn-popover__title">{node.label}</h4>
        </div>
        <button
          type="button"
          className="dn-popover__close"
          onClick={onClose}
          aria-label="閉じる"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* スクロール可能なコンテンツエリア */}
      <div className="dn-popover__scrollable">
        {/* 1. サマリー */}
        {summary && (
          <div className="dn-popover__section dn-popover__section--why">
            <p className="dn-popover__why-summary">{summary}</p>
          </div>
        )}

        {/* 2. リスク警告（あれば最初に見せる） */}
        {hasRiskInfo && (
          <div className="dn-popover__section dn-popover__section--risk">
            <div className="dn-popover__risk-tags">
              {node.riskStrategy && (
                <div className={`dn-popover__risk-tag dn-popover__risk-tag--${node.riskStrategy}`}>
                  <span className="dn-popover__risk-tag-label">
                    {node.riskStrategy === "avoid" && "リスク回避"}
                    {node.riskStrategy === "mitigate" && "リスク軽減"}
                    {node.riskStrategy === "transfer" && "リスク転嫁"}
                    {node.riskStrategy === "accept" && "リスク受容"}
                  </span>
                  {node.riskDetail?.targetRisk && (
                    <p className="dn-popover__risk-tag-desc">{node.riskDetail.targetRisk}</p>
                  )}
                </div>
              )}
              {!node.riskStrategy && node.riskLevel && (
                <div className={`dn-popover__risk-tag dn-popover__risk-tag--level-${node.riskLevel}`}>
                  <span className="dn-popover__risk-tag-label">
                    {node.riskLevel === "high" && "高リスク"}
                    {node.riskLevel === "medium" && "中リスク"}
                    {node.riskLevel === "low" && "低リスク"}
                  </span>
                </div>
              )}
              {node.riskCategories && node.riskCategories.length > 0 && node.riskCategories.map((category, idx) => (
                <div key={idx} className="dn-popover__risk-tag dn-popover__risk-tag--category">
                  <span className="dn-popover__risk-tag-label">
                    {category === "cost" && "コスト影響"}
                    {category === "delivery" && "納期影響"}
                    {category === "quality" && "品質影響"}
                    {category === "safety" && "安全影響"}
                    {category === "scope" && "スコープ影響"}
                    {category === "environment" && "環境影響"}
                  </span>
                </div>
              ))}
            </div>
            {node.riskDetail?.howThisHelps && (
              <p className="dn-popover__risk-effect-text">{node.riskDetail.howThisHelps}</p>
            )}
          </div>
        )}

        {/* 2.5. QCDES・顧客影響（structuredRationaleがある場合） */}
        {node.structuredRationale && (
          <RationaleDisplay rationale={node.structuredRationale} />
        )}

        {/* 3. 選択した理由は？ */}
        <div className="dn-popover__section dn-popover__section--rationale">
          <h5 className="dn-popover__rationale-question">
            {isEditing ? "選択理由を変更しますか？" : "選択した理由は？"}
          </h5>
          <div className="dn-popover__presets">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`dn-popover__chip ${
                  selectedRationales.includes(preset.id) ? "dn-popover__chip--selected" : ""
                }`}
                onClick={() => handleRationaleToggle(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="dn-popover__input"
            placeholder="その他の理由を入力..."
            value={customRationale}
            onChange={(e) => setCustomRationale(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
          />
        </div>
      </div>

      {/* フッター */}
      <div className="dn-popover__footer">
        <button
          type="button"
          className="dn-popover__cancel-btn"
          onClick={onClose}
        >
          キャンセル
        </button>
        <button
          type="button"
          className="dn-popover__select-btn"
          onClick={handleSubmit}
        >
          {isEditing ? "理由を更新" : "選択する"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Phase 10: 根拠表示コンポーネント
// ============================================================

type RationaleDisplayProps = {
  rationale: StructuredRecommendationRationale;
};

function RationaleDisplay({ rationale }: RationaleDisplayProps) {
  return (
    <div className="dn-rationale">
      {/* Phase 15.3: 表示順序変更 - 顧客影響を最優先 */}

      {/* 1. 顧客への影響（最重要） */}
      {rationale.customerImpact && (
        <div className="dn-rationale__customer">
          <h5 className="dn-rationale__customer-title">顧客への影響</h5>
          <div className="dn-rationale__customer-grid">
            {rationale.customerImpact.relationship && (
              <CustomerImpactItem label="顧客関係" impact={rationale.customerImpact.relationship} />
            )}
            {rationale.customerImpact.satisfaction && (
              <CustomerImpactItem label="顧客満足" impact={rationale.customerImpact.satisfaction} />
            )}
            {rationale.customerImpact.value && (
              <CustomerImpactItem label="顧客価値" impact={rationale.customerImpact.value} />
            )}
          </div>
        </div>
      )}

      {/* 2. QCDES影響 */}
      {rationale.qcdesImpact && (
        <div className="dn-rationale__qcdes">
          <h5 className="dn-rationale__qcdes-title">QCDES影響</h5>
          <div className="dn-rationale__qcdes-grid">
            {rationale.qcdesImpact.quality && (
              <QCDESItem label="品質" impact={rationale.qcdesImpact.quality} />
            )}
            {rationale.qcdesImpact.cost && (
              <QCDESItem label="コスト" impact={rationale.qcdesImpact.cost} />
            )}
            {rationale.qcdesImpact.delivery && (
              <QCDESItem label="納期" impact={rationale.qcdesImpact.delivery} />
            )}
            {rationale.qcdesImpact.environment && (
              <QCDESItem label="環境" impact={rationale.qcdesImpact.environment} />
            )}
            {rationale.qcdesImpact.safety && (
              <QCDESItem label="安全" impact={rationale.qcdesImpact.safety} />
            )}
          </div>
        </div>
      )}

      {/* 3. 主根拠（PMBOK/ビジネス/文脈適合） */}
      <div className="dn-rationale-item dn-rationale-item--primary">
        <div className="dn-rationale-item__header">
          <span className={`dn-rationale-item__type-badge dn-rationale-item__type-badge--${rationale.primary.type}`}>
            {RATIONALE_TYPE_LABELS[rationale.primary.type]}
          </span>
          <span className="dn-rationale-item__title">{rationale.primary.title}</span>
        </div>
        <p className="dn-rationale-item__content">{rationale.primary.content}</p>
      </div>

      {/* 4. 副次的根拠 */}
      {rationale.secondary?.map((item, index) => (
        <div key={index} className="dn-rationale-item">
          <div className="dn-rationale-item__header">
            <span className={`dn-rationale-item__type-badge dn-rationale-item__type-badge--${item.type}`}>
              {RATIONALE_TYPE_LABELS[item.type]}
            </span>
            <span className="dn-rationale-item__title">{item.title}</span>
          </div>
          <p className="dn-rationale-item__content">{item.content}</p>
        </div>
      ))}

      {/* 5. 推奨の決め手（推奨ノードのみ） */}
      {rationale.decisionPoints && rationale.decisionPoints.length > 0 && (
        <div className="dn-rationale__decision-points">
          <h5 className="dn-rationale__decision-points-title">推奨の決め手</h5>
          <ul className="dn-rationale__decision-points-list">
            {rationale.decisionPoints.map((point, index) => (
              <li key={index} className="dn-rationale__decision-point">
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Phase 13: QCDES影響アイテムコンポーネント（詳細表示用）
// ============================================================

type QCDESItemProps = {
  label: string;
  impact: ImpactAssessment;
};

function QCDESItem({ label, impact }: QCDESItemProps) {
  const iconMap: Record<string, string> = {
    positive: "✓",
    negative: "!",
    neutral: "-",
  };

  return (
    <div className={`dn-rationale__qcdes-item dn-rationale__qcdes-item--${impact.impact}`}>
      <span className="dn-rationale__qcdes-icon">{iconMap[impact.impact]}</span>
      <span className="dn-rationale__qcdes-label">{label}</span>
      <span className="dn-rationale__qcdes-desc">{impact.description}</span>
    </div>
  );
}

type CustomerImpactItemProps = {
  label: string;
  impact: ImpactAssessment;
};

function CustomerImpactItem({ label, impact }: CustomerImpactItemProps) {
  const iconMap: Record<string, string> = {
    positive: "✓",
    negative: "!",
    neutral: "-",
  };

  return (
    <div className={`dn-rationale__customer-item dn-rationale__customer-item--${impact.impact}`}>
      <span className="dn-rationale__customer-icon">{iconMap[impact.impact]}</span>
      <span className="dn-rationale__customer-label">{label}</span>
      <span className="dn-rationale__customer-desc">{impact.description}</span>
    </div>
  );
}
