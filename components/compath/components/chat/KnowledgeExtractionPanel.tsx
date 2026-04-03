"use client"
/**
 * 文書構造解析パネル
 *
 * チャット画面から起動される全画面パネル
 * 意思決定ナビゲーターと同様のUI構造
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

import AxisTabs from "../AxisTabs";
import GraphView from "../GraphView";
import MissingList from "../MissingList";
import KnowledgeDashboard from "../KnowledgeDashboard";
import { analyzeDocument } from "../../api/analyze";
import type { AnalysisResult } from "../../types";
import { extractKnowledge } from "../../utils/knowledgeExtractor";
import {
  SAMPLE_TROUBLE_REPORT_COMPLETE,
} from "../../data/sampleKnowledgeData";

type KnowledgeExtractionPanelProps = {
  /** 初期サンプルデータID */
  sampleDataId?: "trouble_report" | null;
  /** パネルを閉じる */
  onClose: () => void;
};

export function KnowledgeExtractionPanel({
  sampleDataId,
  onClose,
}: KnowledgeExtractionPanelProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedAxisId, setSelectedAxisId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  // パネルが開いたらサンプルデータで自動分析開始
  useEffect(() => {
    if (!sampleDataId || analysis || isLoading) return;

    const startAnalysis = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let sampleText = "";
        if (sampleDataId === "trouble_report") {
          sampleText = SAMPLE_TROUBLE_REPORT_COMPLETE;
        }

        if (sampleText) {
          const blob = new Blob([sampleText], { type: "text/plain" });
          const file = new File([blob], "sample_report.txt", { type: "text/plain" });
          const result = await analyzeDocument(file);
          setAnalysis(result);
          setSelectedAxisId(result.axes[0]?.id ?? "");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "分析に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    startAnalysis();
  }, [sampleDataId]);

  const selectedGraph = analysis?.graphs.find((graph) => graph.axisId === selectedAxisId);

  const derived = useMemo(() => {
    return extractKnowledge(selectedGraph, analysis?.summary ?? "", analysis?.fullText);
  }, [selectedGraph, analysis?.summary, analysis?.fullText]);

  const formattedSummary = useMemo(() => {
    if (!analysis?.summary) return "";
    const trimmed = analysis.summary.trim();
    if (!trimmed) return "";

    if (trimmed.includes("\n") || /^[-*・]/m.test(trimmed)) {
      return trimmed;
    }

    const sentences = trimmed
      .split(/(?<=[。！？])/u)
      .map((part) => part.trim())
      .filter(Boolean);

    if (sentences.length <= 1) {
      return trimmed;
    }

    return sentences.map((line) => `- ${line}`).join("\n");
  }, [analysis?.summary]);

  return (
    <div className="ke-panel">
      {/* ヘッダー */}
      <div className="ke-panel__header">
        <div className="ke-panel__title">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>文書構造解析</span>
        </div>
        <button
          type="button"
          className="ke-panel__close"
          onClick={onClose}
          title="閉じる"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="ke-panel__error">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            閉じる
          </button>
        </div>
      )}

      {/* ローディング中 */}
      {isLoading && !analysis && (
        <div className="ke-panel__loading">
          <span className="ke-panel__spinner" />
          <span>報告書を分析しています...</span>
        </div>
      )}

      {/* コンテンツ: 分析完了後 */}
      {analysis && (
        <div className="ke-panel__content">
          {/* 解析結果サマリー */}
          <div className="ke-panel__summary">
            <div className="ke-panel__summary-grid">
              <div>
                <span className="ke-panel__summary-label">ドキュメント種別</span>
                <strong>{analysis.documentType}</strong>
              </div>
              <div>
                <span className="ke-panel__summary-label">ページ数</span>
                <strong>{analysis.meta.pageCount}</strong>
              </div>
              <div>
                <span className="ke-panel__summary-label">文字数</span>
                <strong>{analysis.meta.textLength}</strong>
              </div>
              <button
                type="button"
                className="ke-panel__dashboard-btn"
                onClick={() => setIsDashboardOpen(true)}
              >
                ナレッジ可視化
              </button>
            </div>
            <div className="ke-panel__summary-text">
              <span className="ke-panel__summary-label">要約</span>
              <div className="markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {formattedSummary}
                </ReactMarkdown>
              </div>
            </div>
            {analysis.warnings.length > 0 && (
              <div className="ke-panel__warnings">
                <span className="ke-panel__summary-label">注意</span>
                <ul>
                  {analysis.warnings.map((warning, idx) => (
                    <li key={`${warning}-${idx}`}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 軸タブ */}
          <div className="ke-panel__axes">
            <AxisTabs
              axes={analysis.axes}
              selectedAxisId={selectedAxisId}
              onSelect={setSelectedAxisId}
            />
          </div>

          {/* グラフビュー */}
          <div className="ke-panel__graph-area">
            {selectedGraph ? (
              <>
                <div className="ke-panel__graph">
                  <GraphView
                    graph={selectedGraph}
                    summary={analysis.summary}
                    feedforward={derived.feedforward}
                    feedback={derived.feedback}
                  />
                </div>
                <div className="ke-panel__missing">
                  <MissingList nodes={selectedGraph.nodes} />
                </div>
              </>
            ) : (
              <div className="ke-panel__no-graph">
                <p>表示できるグラフがありません。</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ダッシュボード */}
      {analysis && isDashboardOpen && (
        <KnowledgeDashboard
          analysis={analysis}
          derived={derived}
          onClose={() => setIsDashboardOpen(false)}
        />
      )}
    </div>
  );
}
