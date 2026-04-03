"use client"
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import AxisTabs from "../AxisTabs";
import FileDrop from "../FileDrop";
import GraphView from "../GraphView";
import MissingList from "../MissingList";
import KnowledgeDashboard from "../KnowledgeDashboard";
import { analyzeDocument } from "../../api/analyze";
import { updateDocumentClassification } from "../../api/history";
import type { AnalysisResult, DocumentClassification } from "../../types";
import { extractKnowledge } from "../../utils/knowledgeExtractor";
import {
  SAMPLE_TROUBLE_REPORT_COMPLETE,
  SAMPLE_TROUBLE_REPORT_INCOMPLETE,
  SAMPLE_INVESTIGATION_MEMO,
  SAMPLE_KNOWLEDGE_DESCRIPTIONS,
} from "../../data/sampleKnowledgeData";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

type AnalysisPageProps = {
  initialResult?: AnalysisResult;
  initialFileName?: string;
  /** 履歴から読み込んだ場合のID（文書分類UIを表示するため） */
  historyId?: string;
  /** 初期の文書分類 */
  initialClassification?: DocumentClassification;
  onAnalysisComplete?: (fileName: string, result: AnalysisResult) => void;
};

export default function AnalysisPage({
  initialResult,
  initialFileName,
  historyId,
  initialClassification,
  onAnalysisComplete
}: AnalysisPageProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(initialResult ?? null);
  const [selectedAxisId, setSelectedAxisId] = useState<string>(initialResult?.axes[0]?.id ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string; type: string } | null>(
    initialFileName ? { name: initialFileName, size: "", type: "" } : null
  );
  const [textInput, setTextInput] = useState("");
  const [isTextMode, setIsTextMode] = useState(false);
  const visualizationRef = useRef<HTMLDivElement | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  // 文書分類の状態
  const [documentClassification, setDocumentClassification] = useState<DocumentClassification | undefined>(
    initialClassification
  );
  const [isClassificationUpdating, setIsClassificationUpdating] = useState(false);

  // 初期値が変更されたら状態を更新
  useEffect(() => {
    if (initialResult) {
      setAnalysis(initialResult);
      setSelectedAxisId(initialResult.axes[0]?.id ?? "");
      setFileInfo(initialFileName ? { name: initialFileName, size: "", type: "" } : null);
      setError(null);
    }
  }, [initialResult, initialFileName]);

  // 文書分類の初期値が変更されたら状態を更新
  useEffect(() => {
    setDocumentClassification(initialClassification);
  }, [initialClassification]);

  // 文書分類の変更ハンドラ
  const handleClassificationChange = async (newClassification: DocumentClassification) => {
    if (!historyId || isClassificationUpdating) return;

    setIsClassificationUpdating(true);
    try {
      await updateDocumentClassification(historyId, newClassification);
      setDocumentClassification(newClassification);
    } catch (err) {
      console.error("Failed to update classification:", err);
      setError("文書分類の更新に失敗しました。");
    } finally {
      setIsClassificationUpdating(false);
    }
  };

  const handleFileSelected = async (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("ファイルサイズが50MBを超えています。");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setSelectedAxisId("");
    setFileInfo({
      name: file.name,
      size: formatBytes(file.size),
      type: file.type || "unknown"
    });

    try {
      const result = await analyzeDocument(file);
      setAnalysis(result);
      setSelectedAxisId(result.axes[0]?.id ?? "");
      // 分析完了を通知
      onAnalysisComplete?.(file.name, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "解析に失敗しました。";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const openDashboard = () => {
    if (!analysis) return;
    setIsDashboardOpen(true);
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      setError("テキストを入力してください。");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setSelectedAxisId("");
    setFileInfo({
      name: "入力テキスト",
      size: `${textInput.length} chars`,
      type: "text/plain"
    });

    try {
      const blob = new Blob([textInput], { type: "text/plain" });
      const file = new File([blob], "input.txt", { type: "text/plain" });
      const result = await analyzeDocument(file);
      setAnalysis(result);
      setSelectedAxisId(result.axes[0]?.id ?? "");
      // 分析完了を通知
      onAnalysisComplete?.("入力テキスト", result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "解析に失敗しました。";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedGraph = analysis?.graphs.find((graph) => graph.axisId === selectedAxisId);
  const graphStats = useMemo(() => {
    if (!selectedGraph) return null;
    const levelStats = selectedGraph.levels.map((lvl) => {
      const nodes = selectedGraph.nodes.filter((n) => n.levelLabel === lvl.label);
      const missing = nodes.filter((n) => n.status === "missing").length;
      return {
        level: lvl.label,
        total: nodes.length,
        missing
      };
    });
    return {
      totalNodes: selectedGraph.nodes.length,
      totalEdges: selectedGraph.edges.length,
      levelStats,
      missingTotal: selectedGraph.nodes.filter((n) => n.status === "missing").length
    };
  }, [selectedGraph]);
  const formattedSummary = analysis ? formatSummaryMarkdown(analysis.summary) : "";
  const derived = useMemo(() => {
    return extractKnowledge(selectedGraph, analysis?.summary ?? "", analysis?.fullText);
  }, [selectedGraph, analysis?.summary, analysis?.fullText]);

  return (
    <div className="analysis-page">
      <div className="analysis-page__header">
        <h1>ナレッジ抽出</h1>
        <p className="muted">
          報告書から知見を構造化し、欠損している情報を可視化します。
        </p>
      </div>

      <section className="panel-grid">
        <div className="card">
          <div className="card__header">
            <h2>入力</h2>
            <div className="toggle">
              <button
                type="button"
                className={`toggle__btn ${!isTextMode ? "is-active" : ""}`}
                onClick={() => setIsTextMode(false)}
              >
                ファイル
              </button>
              <button
                type="button"
                className={`toggle__btn ${isTextMode ? "is-active" : ""}`}
                onClick={() => setIsTextMode(true)}
              >
                テキスト
              </button>
            </div>
          </div>
          <p className="muted">
            ページ単位で分割し、50MBまで解析します。テキスト入力も可能です。
          </p>

          {/* サンプルデータ読み込みボタン */}
          <div className="sample-data-buttons">
            <span className="sample-data-buttons__label">サンプルデータ:</span>
            <button
              type="button"
              className="sample-data-btn"
              onClick={() => {
                setTextInput(SAMPLE_TROUBLE_REPORT_COMPLETE);
                setIsTextMode(true);
                setAnalysis(null);
              }}
              disabled={isLoading}
              title={SAMPLE_KNOWLEDGE_DESCRIPTIONS.SAMPLE_TROUBLE_REPORT_COMPLETE.description}
            >
              {SAMPLE_KNOWLEDGE_DESCRIPTIONS.SAMPLE_TROUBLE_REPORT_COMPLETE.title}
            </button>
            <button
              type="button"
              className="sample-data-btn"
              onClick={() => {
                setTextInput(SAMPLE_TROUBLE_REPORT_INCOMPLETE);
                setIsTextMode(true);
                setAnalysis(null);
              }}
              disabled={isLoading}
              title={SAMPLE_KNOWLEDGE_DESCRIPTIONS.SAMPLE_TROUBLE_REPORT_INCOMPLETE.description}
            >
              {SAMPLE_KNOWLEDGE_DESCRIPTIONS.SAMPLE_TROUBLE_REPORT_INCOMPLETE.title}
            </button>
            <button
              type="button"
              className="sample-data-btn"
              onClick={() => {
                setTextInput(SAMPLE_INVESTIGATION_MEMO);
                setIsTextMode(true);
                setAnalysis(null);
              }}
              disabled={isLoading}
              title={SAMPLE_KNOWLEDGE_DESCRIPTIONS.SAMPLE_INVESTIGATION_MEMO.description}
            >
              {SAMPLE_KNOWLEDGE_DESCRIPTIONS.SAMPLE_INVESTIGATION_MEMO.title}
            </button>
          </div>

          {!isTextMode ? (
            <FileDrop onFileSelected={handleFileSelected} disabled={isLoading} />
          ) : (
            <div className="text-input">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="ここにテキストを貼り付けてください（最大50MB相当）"
                disabled={isLoading}
              />
              <div className="text-input__actions">
                <span className="muted">{textInput.length} 文字</span>
                <button
                  type="button"
                  className="file-drop__button"
                  onClick={handleTextSubmit}
                  disabled={isLoading}
                >
                  テキストを解析
                </button>
              </div>
            </div>
          )}
          {fileInfo && (
            <div className="file-info">
              <div>
                <span className="file-info__label">ファイル</span>
                <span>{fileInfo.name}</span>
              </div>
              <div>
                <span className="file-info__label">サイズ</span>
                <span>{fileInfo.size}</span>
              </div>
              <div>
                <span className="file-info__label">形式</span>
                <span>{fileInfo.type}</span>
              </div>
            </div>
          )}
          {isLoading && <p className="status">解析中...</p>}
          {error && <p className="status status--error">{error}</p>}
        </div>

        <div className="card">
          <div className="card__header">
            <h2>解析結果</h2>
            <button
              type="button"
              className="visualize-button"
              onClick={openDashboard}
              disabled={!analysis}
            >
              ナレッジ可視化
            </button>
          </div>
          {!analysis && <p className="muted">ファイルを読み込むと結果が表示されます。</p>}
          {analysis && (
            <>
              {/* 文書分類UI（履歴から読み込んだ場合のみ表示） */}
              {historyId && (
                <div className="document-classification">
                  <span className="summary-label">報告書分類</span>
                  <div className="classification-toggle">
                    <button
                      type="button"
                      className={`classification-btn ${documentClassification === "trial_and_error" ? "is-active" : ""}`}
                      onClick={() => handleClassificationChange("trial_and_error")}
                      disabled={isClassificationUpdating}
                    >
                      試行錯誤中
                    </button>
                    <button
                      type="button"
                      className={`classification-btn ${documentClassification === "final_report" ? "is-active" : ""}`}
                      onClick={() => handleClassificationChange("final_report")}
                      disabled={isClassificationUpdating}
                    >
                      最終報告
                    </button>
                    {!documentClassification && (
                      <span className="classification-hint">未設定</span>
                    )}
                  </div>
                </div>
              )}
              <div className="summary-grid">
                <div>
                  <span className="summary-label">ドキュメント種別</span>
                  <strong>{analysis.documentType}</strong>
                </div>
                <div>
                  <span className="summary-label">ページ数</span>
                  <strong>{analysis.meta.pageCount}</strong>
                </div>
                <div>
                  <span className="summary-label">文字数</span>
                  <strong>{analysis.meta.textLength}</strong>
                </div>
              </div>
              <div className="summary">
                <span className="summary-label">要約</span>
                <div className="markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {formattedSummary}
                  </ReactMarkdown>
                </div>
              </div>
              {analysis.warnings.length > 0 && (
                <div className="warnings">
                  <span className="summary-label">注意</span>
                  <ul>
                    {analysis.warnings.map((warning, idx) => (
                      <li key={`${warning}-${idx}`}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {analysis && (
        <>
          <AxisTabs
            axes={analysis.axes}
            selectedAxisId={selectedAxisId}
            onSelect={setSelectedAxisId}
          />
          <section className="visual-grid" ref={visualizationRef}>
            {selectedGraph ? (
              <>
                <GraphView
                  graph={selectedGraph}
                  summary={analysis.summary}
                  feedforward={derived.feedforward}
                  feedback={derived.feedback}
                />
                <MissingList nodes={selectedGraph.nodes} />
              </>
            ) : (
              <div className="card">
                <p className="muted">表示できるグラフがありません。</p>
              </div>
            )}
          </section>
        </>
      )}

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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, index);
  return `${size.toFixed(1)}${units[index]}`;
}

function formatSummaryMarkdown(summary: string): string {
  const trimmed = summary.trim();
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
}
