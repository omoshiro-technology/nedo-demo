"use client"
/**
 * 提案書入力カード（チャット埋め込み用）
 * Phase 28: 営業向け提案書作成支援
 *
 * リデザイン版:
 * - Step 0: 初期選択（類似事例検索 or 新規作成）
 * - Step 1: 顧客選択（デモ用プロファイルから選択）
 * - Step 2: 判断論点（行ベースレイアウト、自由追加可能）
 */

import { useState, useCallback } from "react";
import type {
  CustomerContext,
  EvaluationPoints,
  EvaluationPointRow,
  Importance,
  CurrentStatus,
} from "../../types/proposal";
import {
  IMPORTANCE_LABELS,
  CURRENT_STATUS_LABELS,
  INDUSTRY_LABELS,
  KPI_PRIORITY_LABELS,
} from "../../types/proposal";
import { useDemoScenario } from "../../data/DemoScenarioContext";
import type { ProposalInputData } from "../../types/chat";

type Props = {
  data: ProposalInputData;
  onSubmitStep1: (customerContext: CustomerContext) => void;
  onSubmitStep2: (evaluationPoints: EvaluationPoints) => void;
  /** 類似事例検索を選択したときのコールバック */
  onSelectSimilarCase?: () => void;
  /** 新規作成を選択したときのコールバック */
  onSelectNewProposal?: () => void;
};

const IMPORTANCES: Importance[] = ["high", "medium", "low"];
const CURRENT_STATUSES: CurrentStatus[] = [
  "insufficient",
  "concerning",
  "limited",
  "adequate",
  "unknown",
];

export function ProposalInputCard({
  data,
  onSubmitStep1,
  onSubmitStep2,
  onSelectSimilarCase,
  onSelectNewProposal,
}: Props) {
  const { scenario } = useDemoScenario();

  // Step 1: 選択された顧客プロファイルID
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    scenario.customerProfiles[0]?.id || ""
  );

  // Step 2: 判断論点の行データ（自由追加対応）
  const [evaluationRows, setEvaluationRows] = useState<EvaluationPointRow[]>(
    scenario.defaultEvaluationPointRows.map((row) => ({ ...row }))
  );

  // 新しい行を追加
  const handleAddRow = useCallback(() => {
    const newId = `custom_${Date.now()}`;
    setEvaluationRows((prev) => [
      ...prev,
      {
        id: newId,
        title: "",
        importance: "medium",
        currentStatus: "unknown",
      },
    ]);
  }, []);

  // 行を削除
  const handleRemoveRow = useCallback((id: string) => {
    setEvaluationRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  // 行の値を更新
  const handleRowChange = useCallback(
    (id: string, field: keyof EvaluationPointRow, value: string) => {
      setEvaluationRows((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, [field]: value } : row
        )
      );
    },
    []
  );

  // Step 1の送信: 選択されたプロファイルからCustomerContextを構築
  const handleSubmitStep1 = useCallback(() => {
    const profile = scenario.customerProfiles.find((p) => p.id === selectedProfileId);
    if (!profile) return;

    const customerContext: CustomerContext = {
      name: profile.name,
      industry: profile.industry,
      currentIssues: profile.currentIssues,
      kpiPriority: profile.kpiPriority,
      additionalContext: profile.additionalContext,
    };
    onSubmitStep1(customerContext);
  }, [selectedProfileId, onSubmitStep1]);

  // Step 2の送信: 行データからEvaluationPointsを構築
  const handleSubmitStep2 = useCallback(() => {
    // 最初の3行を標準のキーにマッピング
    const getPoint = (index: number) => {
      const row = evaluationRows[index];
      if (!row) return { importance: "high" as Importance, currentStatus: "unknown" as CurrentStatus };
      return {
        importance: row.importance,
        currentStatus: row.currentStatus,
        note: row.note || row.title, // カスタムタイトルはnoteに含める
      };
    };

    const evaluationPoints: EvaluationPoints = {
      bufferCapacity: getPoint(0),
      switchingImpact: getPoint(1),
      contingencyOptions: getPoint(2),
    };

    // 4行目以降がある場合はadditional noteとして含める
    if (evaluationRows.length > 3) {
      const additionalPoints = evaluationRows.slice(3).map((row) => ({
        title: row.title,
        importance: row.importance,
        currentStatus: row.currentStatus,
        note: row.note,
      }));
      // contingencyOptionsのnoteに追加論点を含める
      evaluationPoints.contingencyOptions.note =
        (evaluationPoints.contingencyOptions.note || "") +
        "\n\n【追加論点】\n" +
        additionalPoints
          .map(
            (p) =>
              `・${p.title}（重要度: ${IMPORTANCE_LABELS[p.importance]}、現状: ${CURRENT_STATUS_LABELS[p.currentStatus]}）`
          )
          .join("\n");
    }

    onSubmitStep2(evaluationPoints);
  }, [evaluationRows, onSubmitStep2]);

  // Step 0: 初期選択（類似事例検索 or 新規作成）
  if (data.step === 0) {
    return (
      <div className="proposal-input-card proposal-input-card--choice">
        <div className="proposal-input-card__header">
          <h4 className="proposal-input-card__title">どちらの方法で作成しますか？</h4>
        </div>

        <div className="proposal-input-card__choice-grid">
          {/* 類似事例を参照 */}
          <button
            type="button"
            className="proposal-input-card__choice-btn"
            onClick={onSelectSimilarCase}
          >
            <span className="proposal-input-card__choice-icon">🔍</span>
            <span className="proposal-input-card__choice-title">類似事例を参照</span>
            <span className="proposal-input-card__choice-desc">
              過去の類似案件を検索して参考にする
            </span>
          </button>

          {/* 新規作成 */}
          <button
            type="button"
            className="proposal-input-card__choice-btn"
            onClick={onSelectNewProposal}
          >
            <span className="proposal-input-card__choice-icon">✏️</span>
            <span className="proposal-input-card__choice-title">新規作成</span>
            <span className="proposal-input-card__choice-desc">
              顧客を選択して提案書を作成
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Step 1: 顧客選択（シンプル化）
  if (data.step === 1) {
    const selectedProfile = scenario.customerProfiles.find((p) => p.id === selectedProfileId);

    return (
      <div className="proposal-input-card proposal-input-card--compact">
        <div className="proposal-input-card__header">
          <span className="proposal-input-card__step-badge">Step 1/2</span>
          <h4 className="proposal-input-card__title">顧客を選択してください</h4>
        </div>

        <div className="proposal-input-card__body">
          {/* 顧客選択ドロップダウン */}
          <div className="proposal-input-card__customer-select">
            <select
              className="proposal-input-card__select proposal-input-card__select--full"
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
            >
              {scenario.customerProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>

          {/* 選択された顧客のサマリー表示 */}
          {selectedProfile && (
            <div className="proposal-input-card__profile-summary">
              <div className="proposal-input-card__profile-detail">
                <span className="proposal-input-card__detail-label">業種:</span>
                <span className="proposal-input-card__detail-value">{INDUSTRY_LABELS[selectedProfile.industry]}</span>
              </div>
              <div className="proposal-input-card__profile-detail">
                <span className="proposal-input-card__detail-label">KPI:</span>
                <span className="proposal-input-card__detail-value">{KPI_PRIORITY_LABELS[selectedProfile.kpiPriority].label}</span>
              </div>
              {selectedProfile.additionalContext && (
                <div className="proposal-input-card__profile-context">
                  {selectedProfile.additionalContext}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="proposal-input-card__footer">
          <button
            className="proposal-input-card__submit-btn"
            onClick={handleSubmitStep1}
          >
            次へ：判断論点の確認
          </button>
        </div>
      </div>
    );
  }

  // Step 2: 判断論点（行ベースレイアウト）
  const isStep2Valid = evaluationRows.length > 0 && evaluationRows.every((row) => row.title.trim() !== "" || row.id.startsWith("bufferCapacity") || row.id.startsWith("switchingImpact") || row.id.startsWith("contingencyOptions"));

  return (
    <div className="proposal-input-card proposal-input-card--evaluation">
      <div className="proposal-input-card__header">
        <span className="proposal-input-card__step-badge">Step 2/2</span>
        <h4 className="proposal-input-card__title">判断論点を確認</h4>
      </div>

      <div className="proposal-input-card__body">
        {/* 行ベースの判断論点テーブル */}
        <div className="proposal-input-card__eval-table">
          {/* ヘッダー行 */}
          <div className="proposal-input-card__eval-header">
            <div className="proposal-input-card__eval-col proposal-input-card__eval-col--title">
              論点
            </div>
            <div className="proposal-input-card__eval-col proposal-input-card__eval-col--importance">
              重要度
            </div>
            <div className="proposal-input-card__eval-col proposal-input-card__eval-col--status">
              現状
            </div>
            <div className="proposal-input-card__eval-col proposal-input-card__eval-col--action">

            </div>
          </div>

          {/* データ行 */}
          {evaluationRows.map((row, index) => {
            const isDefault = ["bufferCapacity", "switchingImpact", "contingencyOptions"].includes(row.id);
            return (
              <div key={row.id} className="proposal-input-card__eval-row">
                <div className="proposal-input-card__eval-col proposal-input-card__eval-col--title">
                  {isDefault ? (
                    <span className="proposal-input-card__eval-title-text">{row.title}</span>
                  ) : (
                    <input
                      type="text"
                      className="proposal-input-card__eval-input"
                      placeholder="論点を入力"
                      value={row.title}
                      onChange={(e) => handleRowChange(row.id, "title", e.target.value)}
                    />
                  )}
                </div>
                <div className="proposal-input-card__eval-col proposal-input-card__eval-col--importance">
                  <select
                    className="proposal-input-card__eval-select"
                    value={row.importance}
                    onChange={(e) =>
                      handleRowChange(row.id, "importance", e.target.value)
                    }
                  >
                    {IMPORTANCES.map((imp) => (
                      <option key={imp} value={imp}>
                        {IMPORTANCE_LABELS[imp]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="proposal-input-card__eval-col proposal-input-card__eval-col--status">
                  <select
                    className="proposal-input-card__eval-select"
                    value={row.currentStatus}
                    onChange={(e) =>
                      handleRowChange(row.id, "currentStatus", e.target.value)
                    }
                  >
                    {CURRENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {CURRENT_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="proposal-input-card__eval-col proposal-input-card__eval-col--action">
                  {!isDefault && (
                    <button
                      type="button"
                      className="proposal-input-card__remove-btn"
                      onClick={() => handleRemoveRow(row.id)}
                      title="削除"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* 行追加ボタン */}
          <button
            type="button"
            className="proposal-input-card__add-row-btn"
            onClick={handleAddRow}
          >
            + 論点を追加
          </button>
        </div>
      </div>

      <div className="proposal-input-card__footer">
        <button
          className="proposal-input-card__submit-btn proposal-input-card__submit-btn--generate"
          onClick={handleSubmitStep2}
        >
          提案書を生成
        </button>
      </div>
    </div>
  );
}
