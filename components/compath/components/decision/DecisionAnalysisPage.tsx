"use client"
import { useState, useCallback, useRef } from "react";
import { analyzeDecisions } from "../../api/decisionAnalysis";
import type { DecisionTimelineResult, DecisionItem } from "../../types";
import TimelineView from "./TimelineView";
import SummaryDashboard from "./SummaryDashboard";
import {
  SAMPLE_MEETING_MINUTES,
  SAMPLE_CRITICAL_DECISIONS,
  SAMPLE_AMBIGUOUS_DECISIONS,
  SAMPLE_DATA_DESCRIPTIONS,
} from "../../data/sampleDecisionData";

type FileWithMeta = {
  file: File;
  createdAt?: string;
  modifiedAt?: string;
};

export default function DecisionAnalysisPage() {
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [result, setResult] = useState<DecisionTimelineResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleSelectDecision = useCallback((decision: DecisionItem) => {
    setSelectedDecisionId(decision.id);
    // TimelineViewセクションへスクロール
    if (timelineRef.current) {
      timelineRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    const filesWithMeta = newFiles.map((file) => ({
      file,
      modifiedAt: new Date(file.lastModified).toISOString(),
    }));
    setFiles((prev) => [...prev, ...filesWithMeta]);
    setError(null);
  }, []);

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    // ファイルが変更されたら分析結果をリセット
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setError("ファイルを選択してください。");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const analysisResult = await analyzeDecisions(files);
      setResult(analysisResult);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "分析に失敗しました。";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextAnalyze = async () => {
    if (!textInput.trim()) {
      setError("テキストを入力してください。");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const blob = new Blob([textInput], { type: "text/plain" });
      const file = new File([blob], "入力テキスト.txt", { type: "text/plain" });
      const fileWithMeta: FileWithMeta = {
        file,
        modifiedAt: new Date().toISOString(),
      };
      const analysisResult = await analyzeDecisions([fileWithMeta]);
      setResult(analysisResult);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "分析に失敗しました。";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFilesSelected(droppedFiles);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      handleFilesSelected(Array.from(selectedFiles));
    }
    // Reset input
    e.target.value = "";
  };

  return (
    <div className="decision-analysis-page">
      <div className="decision-analysis-page__header">
        <h1>意思決定タイムライン</h1>
        <p className="muted">
          議事録や会議記録から意思決定事項を抽出し、時系列で可視化します。
        </p>
      </div>

      <section className="panel-grid">
        {/* 左カラム: 入力 */}
        <div className="card">
          <div className="card__header">
            <h2>文書選択</h2>
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

          {/* サンプルデータ読み込みボタン */}
          <div className="sample-data-buttons">
            <span className="sample-data-buttons__label">サンプルデータ:</span>
            <button
              type="button"
              className="sample-data-btn"
              onClick={() => {
                setTextInput(SAMPLE_MEETING_MINUTES);
                setIsTextMode(true);
                setResult(null);
              }}
              disabled={isLoading}
              title={SAMPLE_DATA_DESCRIPTIONS.SAMPLE_MEETING_MINUTES.description}
            >
              {SAMPLE_DATA_DESCRIPTIONS.SAMPLE_MEETING_MINUTES.title}
            </button>
            <button
              type="button"
              className="sample-data-btn"
              onClick={() => {
                setTextInput(SAMPLE_CRITICAL_DECISIONS);
                setIsTextMode(true);
                setResult(null);
              }}
              disabled={isLoading}
              title={SAMPLE_DATA_DESCRIPTIONS.SAMPLE_CRITICAL_DECISIONS.description}
            >
              {SAMPLE_DATA_DESCRIPTIONS.SAMPLE_CRITICAL_DECISIONS.title}
            </button>
            <button
              type="button"
              className="sample-data-btn"
              onClick={() => {
                setTextInput(SAMPLE_AMBIGUOUS_DECISIONS);
                setIsTextMode(true);
                setResult(null);
              }}
              disabled={isLoading}
              title={SAMPLE_DATA_DESCRIPTIONS.SAMPLE_AMBIGUOUS_DECISIONS.description}
            >
              {SAMPLE_DATA_DESCRIPTIONS.SAMPLE_AMBIGUOUS_DECISIONS.title}
            </button>
          </div>

          {!isTextMode ? (
            <>
              <div
                className={`file-drop-zone ${isDragging ? "is-dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="file-drop-zone__content">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="12" y2="12" />
                    <line x1="15" y1="15" x2="12" y2="12" />
                  </svg>
                  <p>
                    ファイルをドラッグ&ドロップ
                    <br />
                    または
                  </p>
                  <label className="file-select-button">
                    ファイルを選択
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileInputChange}
                      disabled={isLoading}
                    />
                  </label>
                  <p className="muted small">
                    対応形式: PDF, Word (.docx), テキスト (.txt)
                  </p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="file-list">
                  {files.map((f, index) => (
                    <div key={`${f.file.name}-${index}`} className="file-list__item">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="file-list__item-name">{f.file.name}</span>
                      <span className="file-list__item-date">
                        {new Date(f.file.lastModified).toLocaleDateString("ja-JP")}
                      </span>
                      <button
                        type="button"
                        className="file-list__item-remove"
                        onClick={() => handleRemoveFile(index)}
                        disabled={isLoading}
                        aria-label="削除"
                      >
                        <svg
                          width="16"
                          height="16"
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
                  ))}
                </div>
              )}

              <button
                type="button"
                className="analyze-button"
                onClick={handleAnalyze}
                disabled={isLoading || files.length === 0}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    分析中...
                  </>
                ) : (
                  "タイムラインを生成"
                )}
              </button>
            </>
          ) : (
            <>
              <div className="text-input">
                <textarea
                  value={textInput}
                  onChange={(e) => {
                    setTextInput(e.target.value);
                    setResult(null);
                  }}
                  placeholder="ここに議事録や会議記録のテキストを貼り付けてください"
                  disabled={isLoading}
                />
                <div className="text-input__actions">
                  <span className="muted">{textInput.length} 文字</span>
                  <button
                    type="button"
                    className="analyze-button"
                    onClick={handleTextAnalyze}
                    disabled={isLoading || !textInput.trim()}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner" />
                        分析中...
                      </>
                    ) : (
                      "タイムラインを生成"
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {error && <p className="status status--error">{error}</p>}
        </div>

        {/* 右カラム: 入力ドキュメントプレビュー */}
        <div className="card">
          <div className="card__header">
            <h2>入力ドキュメント</h2>
            {(textInput.trim() || files.length > 0) && (
              <span className="badge">
                {isTextMode ? `${textInput.length}文字` : `${files.length}ファイル`}
              </span>
            )}
          </div>

          {isTextMode && textInput.trim() ? (
            <div className="document-preview">
              <pre className="document-preview__content">{textInput}</pre>
            </div>
          ) : !isTextMode && files.length > 0 ? (
            <div className="document-preview">
              <div className="document-preview__files">
                {files.map((f, index) => (
                  <div key={`preview-${f.file.name}-${index}`} className="document-preview__file">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div className="document-preview__file-info">
                      <span className="document-preview__file-name">{f.file.name}</span>
                      <span className="document-preview__file-meta muted small">
                        {(f.file.size / 1024).toFixed(1)} KB • {new Date(f.file.lastModified).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="muted small" style={{ marginTop: "1rem" }}>
                ファイルの内容は分析時に読み込まれます
              </p>
            </div>
          ) : (
            <div className="document-preview document-preview--empty">
              <div className="decision-examples">
                <p className="muted" style={{ marginBottom: "1rem" }}>
                  抽出できる意思決定パターン:
                </p>
                <div className="decision-example">
                  <span className="decision-example__tag decision-example__tag--decision">決定</span>
                  <div className="decision-example__content">
                    <p className="decision-example__text">「〜とする」「〜に決定」</p>
                  </div>
                </div>
                <div className="decision-example">
                  <span className="decision-example__tag decision-example__tag--agreement">合意</span>
                  <div className="decision-example__content">
                    <p className="decision-example__text">「〜で合意」「〜に合意」</p>
                  </div>
                </div>
                <div className="decision-example">
                  <span className="decision-example__tag decision-example__tag--change">変更</span>
                  <div className="decision-example__content">
                    <p className="decision-example__text">「〜に変更」「〜を見直し」</p>
                  </div>
                </div>
                <div className="decision-example">
                  <span className="decision-example__tag decision-example__tag--adoption">採用</span>
                  <div className="decision-example__content">
                    <p className="decision-example__text">「〜を採用」「〜を導入」</p>
                  </div>
                </div>
                <div className="decision-example">
                  <span className="decision-example__tag decision-example__tag--cancellation">中止</span>
                  <div className="decision-example__content">
                    <p className="decision-example__text">「〜を中止」「〜を取りやめ」</p>
                  </div>
                </div>
              </div>
              <p className="muted small" style={{ marginTop: "1rem" }}>
                左側でファイルを選択またはテキストを入力してください
              </p>
            </div>
          )}
        </div>
      </section>

      {result && (
        <section className="decision-analysis-page__result">
          <div className="card">
            <div className="card__header">
              <h2>分析結果</h2>
              <span className="badge badge--accent">
                {result.decisions.length}件の決定事項
              </span>
            </div>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">処理文書数</span>
                <strong>{result.processedDocuments.length}</strong>
              </div>
              <div className="summary-item">
                <span className="summary-label">期間</span>
                <strong>
                  {formatDate(result.timeRange.earliest)} 〜{" "}
                  {formatDate(result.timeRange.latest)}
                </strong>
              </div>
            </div>
            {result.warnings.length > 0 && (
              <div className="warnings">
                <ul>
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {result && result.decisions.length > 0 && (
        <>
          {/* サマリダッシュボード */}
          <section className="decision-analysis-page__summary">
            <SummaryDashboard
              decisions={result.decisions}
              onSelectDecision={handleSelectDecision}
            />
          </section>

          {/* タイムライン */}
          <section className="decision-analysis-page__timeline" ref={timelineRef}>
            <TimelineView
              decisions={result.decisions}
              timeRange={result.timeRange}
              selectedDecisionId={selectedDecisionId}
              onSelectDecision={handleSelectDecision}
            />
          </section>
        </>
      )}

      {result && result.decisions.length === 0 && (
        <section className="decision-analysis-page__empty">
          <div className="card">
            <div className="empty-state">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <h3>意思決定事項が見つかりませんでした</h3>
              <p className="muted">
                選択された文書から「〜とする」「〜で合意」などの
                <br />
                意思決定パターンを検出できませんでした。
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
