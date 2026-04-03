"use client"
import { useState, useCallback } from "react";
import type { MergeCandidate, GraphResult, AnalysisHistory } from "../types";
import {
  detectMergeCandidates,
  updateMergeCandidate,
  updateMergeCandidatesBatch,
  executeMerge,
  clearMergeCandidates
} from "../api/merge";

type Props = {
  histories: AnalysisHistory[];
  onMergeComplete?: (result: {
    graph: GraphResult;
    mergedNodeCount: number;
    sourceDocumentIds: string[];
    warnings: string[];
  }) => void;
};

type ViewState = "select" | "review" | "result";

export function MergeReviewPanel({ histories, onMergeComplete }: Props) {
  const [viewState, setViewState] = useState<ViewState>("select");
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<MergeCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [selectedAxisId, setSelectedAxisId] = useState<string>("");
  const [mergeResult, setMergeResult] = useState<{
    graph: GraphResult;
    mergedNodeCount: number;
    warnings: string[];
  } | null>(null);

  // 利用可能な軸を取得
  const availableAxes = histories.length > 0 ? histories[0].result.graphs : [];

  // 履歴の選択トグル
  const toggleHistorySelection = (historyId: string) => {
    setSelectedHistoryIds((prev) =>
      prev.includes(historyId)
        ? prev.filter((id) => id !== historyId)
        : [...prev, historyId]
    );
  };

  // マージ候補を検出
  const handleDetect = useCallback(async () => {
    if (selectedHistoryIds.length < 2) {
      setError("2つ以上の文書を選択してください。");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await clearMergeCandidates();
      const result = await detectMergeCandidates(selectedHistoryIds);
      setCandidates(result.candidates);
      setViewState("review");

      if (result.candidates.length === 0) {
        setError("類似する事象が見つかりませんでした。");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "検出に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [selectedHistoryIds]);

  // 候補の承認/却下
  const handleCandidateAction = useCallback(
    async (candidateId: string, status: "approved" | "rejected") => {
      try {
        const updated = await updateMergeCandidate(candidateId, status);
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateId ? updated : c))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "更新に失敗しました。");
      }
    },
    []
  );

  // ラベル編集を開始
  const startEditLabel = (candidate: MergeCandidate) => {
    setEditingLabelId(candidate.id);
    setEditingLabel(candidate.mergedLabel || "");
  };

  // ラベル編集を保存
  const saveEditLabel = async () => {
    if (!editingLabelId) return;

    try {
      const updated = await updateMergeCandidate(
        editingLabelId,
        "approved",
        editingLabel
      );
      setCandidates((prev) =>
        prev.map((c) => (c.id === editingLabelId ? updated : c))
      );
      setEditingLabelId(null);
      setEditingLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました。");
    }
  };

  // 全て承認
  const handleApproveAll = useCallback(async () => {
    const pendingCandidates = candidates.filter((c) => c.status === "pending");
    if (pendingCandidates.length === 0) return;

    setIsLoading(true);
    try {
      const updates = pendingCandidates.map((c) => ({
        candidateId: c.id,
        status: "approved" as const
      }));
      const result = await updateMergeCandidatesBatch(updates);
      setCandidates((prev) =>
        prev.map((c) => {
          const updated = result.updated.find((u) => u.id === c.id);
          return updated || c;
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "一括更新に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [candidates]);

  // マージ実行
  const handleExecuteMerge = useCallback(async () => {
    if (!selectedAxisId) {
      setError("統合する軸を選択してください。");
      return;
    }

    const approvedCount = candidates.filter((c) => c.status === "approved").length;
    if (approvedCount === 0) {
      setError("承認済みの候補がありません。");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await executeMerge(selectedHistoryIds, selectedAxisId);
      setMergeResult(result);
      setViewState("result");
      onMergeComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "マージに失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [selectedHistoryIds, selectedAxisId, candidates, onMergeComplete]);

  // 最初からやり直す
  const handleReset = useCallback(async () => {
    await clearMergeCandidates();
    setCandidates([]);
    setMergeResult(null);
    setViewState("select");
    setError(null);
  }, []);

  // 文書選択ビュー
  const renderSelectView = () => (
    <div className="merge-select">
      <h3>統合する文書を選択</h3>
      <p className="muted">2つ以上の分析結果を選択して、類似する事象を検出します。</p>

      <div className="merge-history-list">
        {histories.map((history) => (
          <label key={history.id} className="merge-history-item">
            <input
              type="checkbox"
              checked={selectedHistoryIds.includes(history.id)}
              onChange={() => toggleHistorySelection(history.id)}
            />
            <div className="merge-history-info">
              <span className="merge-history-name">{history.fileName}</span>
              <span className="merge-history-date muted">
                {new Date(history.analyzedAt).toLocaleDateString("ja-JP")}
              </span>
            </div>
          </label>
        ))}
      </div>

      {error && <div className="merge-error">{error}</div>}

      <button
        className="btn-primary"
        onClick={handleDetect}
        disabled={selectedHistoryIds.length < 2 || isLoading}
      >
        {isLoading ? "検出中..." : "類似事象を検出"}
      </button>
    </div>
  );

  // レビュービュー
  const renderReviewView = () => {
    const pendingCount = candidates.filter((c) => c.status === "pending").length;
    const approvedCount = candidates.filter((c) => c.status === "approved").length;

    return (
      <div className="merge-review">
        <div className="merge-review-header">
          <h3>マージ候補のレビュー</h3>
          <div className="merge-review-stats">
            <span className="stat-badge pending">{pendingCount} 未確認</span>
            <span className="stat-badge approved">{approvedCount} 承認済</span>
          </div>
        </div>

        {candidates.length > 0 && (
          <div className="merge-actions-top">
            <button
              className="btn-secondary"
              onClick={handleApproveAll}
              disabled={pendingCount === 0 || isLoading}
            >
              すべて承認
            </button>
          </div>
        )}

        <div className="merge-candidate-list">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className={`merge-candidate-card ${candidate.status}`}
            >
              <div className="merge-candidate-header">
                <span className={`candidate-status ${candidate.status}`}>
                  {candidate.status === "pending"
                    ? "未確認"
                    : candidate.status === "approved"
                    ? "承認済"
                    : "却下"}
                </span>
                <span className="similarity-score">
                  類似度: {candidate.similarityScore}%
                </span>
              </div>

              <div className="merge-candidate-nodes">
                <div className="source-node">
                  <span className="node-label">{getNodeLabel(candidate.sourceNodeId, candidate.sourceDocumentId)}</span>
                  <span className="node-doc muted">{getDocumentName(candidate.sourceDocumentId)}</span>
                </div>
                <div className="merge-arrow">→</div>
                <div className="target-node">
                  <span className="node-label">{getNodeLabel(candidate.targetNodeId, candidate.targetDocumentId)}</span>
                  <span className="node-doc muted">{getDocumentName(candidate.targetDocumentId)}</span>
                </div>
              </div>

              <div className="merge-reason muted">
                {candidate.similarityReason}
              </div>

              {editingLabelId === candidate.id ? (
                <div className="merge-label-edit">
                  <input
                    type="text"
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    placeholder="統合後のラベル"
                  />
                  <button className="btn-small" onClick={saveEditLabel}>
                    保存
                  </button>
                  <button
                    className="btn-small-ghost"
                    onClick={() => setEditingLabelId(null)}
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                candidate.status === "approved" && (
                  <div className="merged-label">
                    <span>統合ラベル: {candidate.mergedLabel}</span>
                    <button
                      className="btn-link"
                      onClick={() => startEditLabel(candidate)}
                    >
                      編集
                    </button>
                  </div>
                )
              )}

              {candidate.status === "pending" && (
                <div className="merge-candidate-actions">
                  <button
                    className="btn-approve"
                    onClick={() => handleCandidateAction(candidate.id, "approved")}
                  >
                    承認
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleCandidateAction(candidate.id, "rejected")}
                  >
                    却下
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <div className="merge-error">{error}</div>}

        <div className="merge-execute-section">
          <div className="axis-select">
            <label>統合する軸:</label>
            <select
              value={selectedAxisId}
              onChange={(e) => setSelectedAxisId(e.target.value)}
            >
              <option value="">選択してください</option>
              {availableAxes.map((axis) => (
                <option key={axis.axisId} value={axis.axisId}>
                  {axis.axisLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="merge-execute-actions">
            <button className="btn-ghost" onClick={handleReset}>
              やり直す
            </button>
            <button
              className="btn-primary"
              onClick={handleExecuteMerge}
              disabled={approvedCount === 0 || !selectedAxisId || isLoading}
            >
              {isLoading ? "実行中..." : "統合グラフを生成"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 結果ビュー
  const renderResultView = () => {
    if (!mergeResult) return null;

    return (
      <div className="merge-result">
        <h3>統合完了</h3>

        <div className="merge-result-stats">
          <div className="result-stat">
            <span className="stat-value">{mergeResult.graph.nodes.length}</span>
            <span className="stat-label">ノード数</span>
          </div>
          <div className="result-stat">
            <span className="stat-value">{mergeResult.mergedNodeCount}</span>
            <span className="stat-label">マージされたノード</span>
          </div>
          <div className="result-stat">
            <span className="stat-value">{mergeResult.graph.edges.length}</span>
            <span className="stat-label">エッジ数</span>
          </div>
        </div>

        {mergeResult.warnings.length > 0 && (
          <div className="merge-warnings">
            <h4>警告</h4>
            <ul>
              {mergeResult.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="merge-result-actions">
          <button className="btn-ghost" onClick={handleReset}>
            別の文書を統合
          </button>
        </div>
      </div>
    );
  };

  // ヘルパー関数
  const getDocumentName = (documentId: string): string => {
    const history = histories.find((h) => h.id === documentId);
    return history?.fileName || documentId;
  };

  const getNodeLabel = (nodeId: string, documentId: string): string => {
    const history = histories.find((h) => h.id === documentId);
    if (!history) return nodeId;

    for (const graph of history.result.graphs) {
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (node) return node.label;
    }
    return nodeId;
  };

  return (
    <div className="merge-review-panel">
      {viewState === "select" && renderSelectView()}
      {viewState === "review" && renderReviewView()}
      {viewState === "result" && renderResultView()}
    </div>
  );
}
