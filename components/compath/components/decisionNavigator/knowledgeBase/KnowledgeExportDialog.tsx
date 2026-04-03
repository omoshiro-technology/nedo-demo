"use client"
/**
 * KnowledgeExportDialog
 *
 * ナレッジのエクスポート/インポートダイアログ
 * - セッションからの学びをエクスポート
 * - 外部ナレッジのインポート
 */

import { useState, useCallback, useRef } from "react";
import * as api from "../../../api/decisionNavigator";

type KnowledgeExportDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  sessionIds?: string[];
};

type ExportOptions = {
  includeHeuristics: boolean;
  includePatterns: boolean;
  minReliability: number;
};

type ImportOptions = {
  duplicateHandling: "skip" | "overwrite" | "merge";
};

export function KnowledgeExportDialog({
  isOpen,
  onClose,
  sessionId,
  sessionIds = [],
}: KnowledgeExportDialogProps) {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // エクスポートオプション
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeHeuristics: true,
    includePatterns: true,
    minReliability: 0,
  });

  // インポートオプション
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    duplicateHandling: "skip",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // エクスポート処理
  const handleExport = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const ids = sessionId ? [sessionId, ...sessionIds] : sessionIds;
      const data = await api.exportKnowledge(
        ids.length > 0 ? ids : undefined,
        exportOptions.includeHeuristics,
        exportOptions.includePatterns,
        exportOptions.minReliability
      );

      // JSONファイルとしてダウンロード
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `knowledge-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(
        `エクスポート完了: ヒューリスティクス${data.heuristics.length}件、パターン${data.patterns.length}件`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "エクスポートに失敗しました");
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId, sessionIds, exportOptions]);

  // インポート処理
  const handleImport = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // バリデーション
        if (!data.version || (!data.heuristics && !data.patterns)) {
          throw new Error("無効なナレッジファイル形式です");
        }

        const result = await api.importKnowledge(data, importOptions.duplicateHandling);

        setSuccess(
          `インポート完了: ヒューリスティクス${result.importedHeuristics}件、パターン${result.importedPatterns}件`
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "インポートに失敗しました");
      } finally {
        setIsProcessing(false);
      }
    },
    [importOptions]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleImport(file);
      }
    },
    [handleImport]
  );

  if (!isOpen) return null;

  return (
    <div className="ked-overlay" onClick={onClose}>
      <div className="ked" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="ked__header">
          <h3 className="ked__title">ナレッジ管理</h3>
          <button
            type="button"
            className="ked__close-btn"
            onClick={onClose}
            aria-label="閉じる"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* タブ */}
        <div className="ked__tabs">
          <button
            type="button"
            className={`ked__tab ${activeTab === "export" ? "ked__tab--active" : ""}`}
            onClick={() => setActiveTab("export")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            エクスポート
          </button>
          <button
            type="button"
            className={`ked__tab ${activeTab === "import" ? "ked__tab--active" : ""}`}
            onClick={() => setActiveTab("import")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            インポート
          </button>
        </div>

        {/* コンテンツ */}
        <div className="ked__content">
          {/* エクスポートタブ */}
          {activeTab === "export" && (
            <div className="ked__export">
              <p className="ked__description">
                蓄積されたナレッジ（ヒューリスティクス・パターン）をJSONファイルとしてエクスポートします。
              </p>

              <div className="ked__options">
                <label className="ked__checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeHeuristics}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        includeHeuristics: e.target.checked,
                      }))
                    }
                  />
                  <span>ヒューリスティクス（経験則）を含める</span>
                </label>

                <label className="ked__checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includePatterns}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        includePatterns: e.target.checked,
                      }))
                    }
                  />
                  <span>判断パターン（成功/失敗事例）を含める</span>
                </label>

                <div className="ked__field">
                  <label className="ked__label">
                    最低信頼度: {exportOptions.minReliability}%
                  </label>
                  <input
                    type="range"
                    className="ked__range"
                    min={0}
                    max={100}
                    value={exportOptions.minReliability}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        minReliability: Number(e.target.value),
                      }))
                    }
                  />
                  <p className="ked__hint">
                    信頼度が低いナレッジを除外できます
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="ked__action-btn"
                onClick={handleExport}
                disabled={isProcessing || (!exportOptions.includeHeuristics && !exportOptions.includePatterns)}
              >
                {isProcessing ? (
                  <>
                    <span className="ked__spinner" />
                    エクスポート中...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    JSONファイルをダウンロード
                  </>
                )}
              </button>
            </div>
          )}

          {/* インポートタブ */}
          {activeTab === "import" && (
            <div className="ked__import">
              <p className="ked__description">
                エクスポートしたナレッジファイル（JSON）をインポートして、過去の学びを活用できます。
              </p>

              <div className="ked__options">
                <div className="ked__field">
                  <label className="ked__label">重複時の処理</label>
                  <div className="ked__radio-group">
                    <label className="ked__radio-label">
                      <input
                        type="radio"
                        name="duplicateHandling"
                        value="skip"
                        checked={importOptions.duplicateHandling === "skip"}
                        onChange={() =>
                          setImportOptions({ duplicateHandling: "skip" })
                        }
                      />
                      <span>スキップ</span>
                      <span className="ked__radio-hint">既存のものを維持</span>
                    </label>
                    <label className="ked__radio-label">
                      <input
                        type="radio"
                        name="duplicateHandling"
                        value="overwrite"
                        checked={importOptions.duplicateHandling === "overwrite"}
                        onChange={() =>
                          setImportOptions({ duplicateHandling: "overwrite" })
                        }
                      />
                      <span>上書き</span>
                      <span className="ked__radio-hint">新しいもので置換</span>
                    </label>
                    <label className="ked__radio-label">
                      <input
                        type="radio"
                        name="duplicateHandling"
                        value="merge"
                        checked={importOptions.duplicateHandling === "merge"}
                        onChange={() =>
                          setImportOptions({ duplicateHandling: "merge" })
                        }
                      />
                      <span>マージ</span>
                      <span className="ked__radio-hint">統計情報を統合</span>
                    </label>
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="ked__file-input"
              />

              <button
                type="button"
                className="ked__action-btn ked__action-btn--secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="ked__spinner" />
                    インポート中...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    ファイルを選択
                  </>
                )}
              </button>
            </div>
          )}

          {/* メッセージ */}
          {error && (
            <div className="ked__message ked__message--error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="ked__message ked__message--success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
