"use client"
/**
 * 質問パネル
 * - 意思決定ナビゲーターの操作主軸
 * - カバレッジマップ + 現在の質問 + 選択肢カード + 理由入力 + 次質問選択
 */

import { useState, useCallback, useMemo } from "react";
import type {
  DecisionNavigatorSession,
  DecisionFlowNode,
  ColumnState,
} from "../../types/decisionNavigator";
import { DEFAULT_RATIONALE_PRESETS } from "./NodePopover";
import { OptionCard } from "./OptionCard";
import { CriteriaSelector } from "./CriteriaSelector";

type QuestionPanelProps = {
  session: DecisionNavigatorSession;
  onSelectOption: (nodeId: string, rationale?: string) => void;
  onSelectNextCriteria: (criteriaId: string) => void;
  isLoading: boolean;
  isAutoExploring?: boolean;
  onSkipDepthFirst?: () => void;
};

export function QuestionPanel({
  session,
  onSelectOption,
  onSelectNextCriteria,
  isLoading,
  isAutoExploring,
  onSkipDepthFirst,
}: QuestionPanelProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedRationales, setSelectedRationales] = useState<string[]>([]);
  const [customRationale, setCustomRationale] = useState("");

  const criteriaLabels = session.criteriaLabels ?? [];
  const columnStates = session.columnStates ?? [];
  const currentColumnIndex = session.currentColumnIndex ?? 0;

  // カバレッジマップ: 各判断軸の状態
  const coveragePieces = useMemo(
    () =>
      criteriaLabels.map((cl, i) => ({
        id: cl.id,
        label: cl.question,
        state: (columnStates[i] ?? "locked") as ColumnState,
      })),
    [criteriaLabels, columnStates]
  );

  // 現在アクティブな判断軸
  const activeCriteria = criteriaLabels[currentColumnIndex];

  // 現在の列が回答済みか
  const isCurrentCompleted = columnStates[currentColumnIndex] === "completed";

  // 選択肢ノード: アクティブ判断軸の子strategy/actionノード
  const optionNodes = useMemo(() => {
    if (!activeCriteria) return [];
    return session.nodes.filter(
      (n) =>
        n.level === "strategy" &&
        n.parentId === activeCriteria.id &&
        n.status !== "hidden"
    );
  }, [session.nodes, activeCriteria]);

  // 既に選択済みのノードID
  const alreadySelectedId = useMemo(() => {
    const found = optionNodes.find((n) => n.status === "selected");
    return found?.id ?? null;
  }, [optionNodes]);

  // 理由プリセット（選択中のノードから取得）
  const rationalePresets = useMemo(() => {
    if (!selectedNodeId) return DEFAULT_RATIONALE_PRESETS;
    const node = optionNodes.find((n) => n.id === selectedNodeId);
    return node?.rationalePresets ?? DEFAULT_RATIONALE_PRESETS;
  }, [selectedNodeId, optionNodes]);

  // カード選択
  const handleCardClick = useCallback(
    (node: DecisionFlowNode) => {
      if (isLoading) return;
      // 既に選択済みのノードをクリックした場合は解除
      if (selectedNodeId === node.id) {
        setSelectedNodeId(null);
        setSelectedRationales([]);
        setCustomRationale("");
      } else {
        setSelectedNodeId(node.id);
        setSelectedRationales([]);
        setCustomRationale("");
      }
    },
    [selectedNodeId, isLoading]
  );

  // 理由チップトグル
  const handleRationaleToggle = useCallback((id: string) => {
    setSelectedRationales((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }, []);

  // 確定
  const handleConfirm = useCallback(() => {
    if (!selectedNodeId) return;

    const rationaleLabels = selectedRationales
      .map((id) => rationalePresets.find((p) => p.id === id)?.label)
      .filter(Boolean);

    if (customRationale.trim()) {
      rationaleLabels.push(customRationale.trim());
    }

    const rationale =
      rationaleLabels.length > 0 ? rationaleLabels.join("・") : undefined;

    onSelectOption(selectedNodeId, rationale);

    // リセット
    setSelectedNodeId(null);
    setSelectedRationales([]);
    setCustomRationale("");
  }, [
    selectedNodeId,
    selectedRationales,
    customRationale,
    rationalePresets,
    onSelectOption,
  ]);

  // 全完了判定
  const completedCount = columnStates.filter((s) => s === "completed").length;
  const totalCount = criteriaLabels.length;
  const isAllCompleted = totalCount > 0 && completedCount === totalCount;

  if (criteriaLabels.length === 0) {
    return (
      <div className="question-panel question-panel--empty">
        <p className="question-panel__empty-text">
          セッションを開始すると質問が表示されます
        </p>
      </div>
    );
  }

  return (
    <div className="question-panel">
      {/* カバレッジマップ */}
      <div className="question-panel__coverage">
        <div className="question-panel__coverage-bar">
          {coveragePieces.map((piece) => (
            <div
              key={piece.id}
              className={`question-panel__coverage-piece question-panel__coverage-piece--${piece.state}`}
              title={piece.label}
            />
          ))}
        </div>
        <span className="question-panel__coverage-text">
          {isAllCompleted
            ? "全観点カバー完了"
            : `${completedCount} / ${totalCount} 観点回答済み`}
        </span>
      </div>

      {/* 全完了メッセージ */}
      {isAllCompleted && (
        <div className="question-panel__complete">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>全ての観点について回答が完了しました</span>
        </div>
      )}

      {/* 深さ優先探索中: ローディング表示（質問セクション全体を置換） */}
      {activeCriteria && !isAllCompleted && isAutoExploring && (
        <div className="question-panel__depth-loading">
          <div className="question-panel__depth-spinner" />
          <span className="question-panel__depth-text">
            選択に基づいて深掘り質問を生成中...
          </span>
          {onSkipDepthFirst && (
            <button
              type="button"
              className="question-panel__depth-skip"
              onClick={onSkipDepthFirst}
            >
              スキップして次の観点へ
            </button>
          )}
        </div>
      )}

      {/* 現在の質問（深さ優先探索中は非表示） */}
      {activeCriteria && !isAllCompleted && !isAutoExploring && (
        <>
          <div className="question-panel__question">
            <h3 className="question-panel__question-text">
              Q: {activeCriteria.question}
            </h3>
            {activeCriteria.description && (
              <p className="question-panel__question-reason">
                {activeCriteria.description}
              </p>
            )}
          </div>

          {/* 選択肢リスト */}
          {!isCurrentCompleted && (
            <div className="question-panel__options">
              {optionNodes.map((node) => (
                <OptionCard
                  key={node.id}
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onClick={() => handleCardClick(node)}
                />
              ))}

              {optionNodes.length === 0 && !isLoading && (
                <p className="question-panel__no-options">
                  選択肢がまだ生成されていません
                </p>
              )}

              {isLoading && optionNodes.length === 0 && (
                <p className="question-panel__loading">選択肢を生成中...</p>
              )}
            </div>
          )}

          {/* 選択済み表示（この列が完了済みの場合） */}
          {isCurrentCompleted && alreadySelectedId && (
            <div className="question-panel__answered">
              <span className="question-panel__answered-badge">回答済み</span>
              <span className="question-panel__answered-label">
                {optionNodes.find((n) => n.id === alreadySelectedId)?.label}
              </span>
            </div>
          )}

          {/* 理由入力（カード選択後に表示） */}
          {selectedNodeId && !isCurrentCompleted && (
            <div className="question-panel__rationale">
              <h4 className="question-panel__rationale-title">選択した理由:</h4>
              <div className="question-panel__rationale-presets">
                {rationalePresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`question-panel__rationale-chip${
                      selectedRationales.includes(preset.id)
                        ? " question-panel__rationale-chip--selected"
                        : ""
                    }`}
                    onClick={() => handleRationaleToggle(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className="question-panel__rationale-input"
                placeholder="その他の理由を入力..."
                value={customRationale}
                onChange={(e) => setCustomRationale(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirm();
                }}
              />
              <button
                type="button"
                className="question-panel__confirm-btn"
                onClick={handleConfirm}
                disabled={isLoading}
              >
                この選択で確定
              </button>
            </div>
          )}

          {/* 次の判断軸セレクター（現在の列が回答済みかつ未完了の列がある場合） */}
          {isCurrentCompleted && (
            <CriteriaSelector
              criteriaLabels={criteriaLabels}
              columnStates={columnStates}
              onSelect={onSelectNextCriteria}
            />
          )}
        </>
      )}
    </div>
  );
}
