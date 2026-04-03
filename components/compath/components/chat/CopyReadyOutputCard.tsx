"use client"
/**
 * コピーレディ出力カード
 *
 * AIが生成した「そのまま使える」出力を表示し、
 * コピー・編集・送信などのアクションを提供する
 */
import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** 出力フォーマット */
type OutputFormat = "markdown" | "plain" | "html" | "csv";

/** 生成された出力データ */
export type GeneratedOutputData = {
  templateId: string;
  templateName: string;
  output: string;
  format: OutputFormat;
  filledPlaceholders: Record<string, string>;
  missingPlaceholders: string[];
  generatedAt: string;
};

type CopyReadyOutputCardProps = {
  /** 生成された出力データ */
  data: GeneratedOutputData;
  /** コピー完了時のコールバック */
  onCopy?: () => void;
  /** 編集ボタンクリック時のコールバック */
  onEdit?: (data: GeneratedOutputData) => void;
  /** メール送信ボタンクリック時のコールバック（メールテンプレートの場合） */
  onSendEmail?: (data: GeneratedOutputData) => void;
  /** カード閉じるボタンクリック時のコールバック */
  onDismiss?: () => void;
  /** 未入力項目の入力フォームを表示するか */
  showMissingForm?: boolean;
  /** 未入力項目の値が更新された時のコールバック */
  onMissingValuesChange?: (values: Record<string, string>) => void;
};

/** フォーマットのアイコン */
const FORMAT_ICONS: Record<OutputFormat, string> = {
  markdown: "📄",
  plain: "📝",
  html: "🌐",
  csv: "📊",
};

export function CopyReadyOutputCard({
  data,
  onCopy,
  onEdit,
  onSendEmail,
  onDismiss,
  showMissingForm = true,
  onMissingValuesChange,
}: CopyReadyOutputCardProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [missingValues, setMissingValues] = useState<Record<string, string>>({});

  // クリップボードにコピー
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(data.output);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [data.output, onCopy]);

  // 未入力項目の値を更新
  const handleMissingValueChange = useCallback(
    (key: string, value: string) => {
      const newValues = { ...missingValues, [key]: value };
      setMissingValues(newValues);
      onMissingValuesChange?.(newValues);
    },
    [missingValues, onMissingValuesChange]
  );

  // テンプレートカテゴリに応じたアイコン
  const getCategoryIcon = () => {
    if (data.templateId.includes("email")) return "📧";
    if (data.templateId.includes("minutes")) return "📝";
    if (data.templateId.includes("checklist")) return "✅";
    if (data.templateId.includes("decision")) return "⚖️";
    if (data.templateId.includes("plan")) return "📋";
    return "📄";
  };

  // メールテンプレートかどうか
  const isEmailTemplate = data.templateId.includes("email");

  return (
    <div className="copy-ready-output-card">
      {/* ヘッダー */}
      <div className="copy-ready-output-card__header">
        <div className="copy-ready-output-card__title">
          <span className="copy-ready-output-card__icon">{getCategoryIcon()}</span>
          <span className="copy-ready-output-card__name">{data.templateName}</span>
          <span className="copy-ready-output-card__format">
            {FORMAT_ICONS[data.format]} {data.format}
          </span>
        </div>
        <div className="copy-ready-output-card__actions">
          <button
            type="button"
            className="copy-ready-output-card__toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "折りたたむ" : "展開"}
          >
            {isExpanded ? "▼" : "▶"}
          </button>
          {onDismiss && (
            <button
              type="button"
              className="copy-ready-output-card__dismiss"
              onClick={onDismiss}
              title="閉じる"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* 未入力項目の警告 */}
          {data.missingPlaceholders.length > 0 && showMissingForm && (
            <div className="copy-ready-output-card__missing">
              <div className="copy-ready-output-card__missing-header">
                <span className="copy-ready-output-card__missing-icon">⚠️</span>
                <span>以下の項目を入力してください:</span>
              </div>
              <div className="copy-ready-output-card__missing-fields">
                {data.missingPlaceholders.map((key) => (
                  <div key={key} className="copy-ready-output-card__missing-field">
                    <label htmlFor={`missing-${key}`}>
                      {key.replace(/_/g, " ")}:
                    </label>
                    <input
                      id={`missing-${key}`}
                      type="text"
                      value={missingValues[key] || ""}
                      onChange={(e) => handleMissingValueChange(key, e.target.value)}
                      placeholder={`${key.replace(/_/g, " ")}を入力`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 出力内容 */}
          <div className="copy-ready-output-card__content">
            {data.format === "markdown" ? (
              <div className="copy-ready-output-card__markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {data.output}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="copy-ready-output-card__plain">{data.output}</pre>
            )}
          </div>

          {/* アクションボタン */}
          <div className="copy-ready-output-card__buttons">
            <button
              type="button"
              className={`copy-ready-output-card__btn copy-ready-output-card__btn--copy ${
                copied ? "copy-ready-output-card__btn--copied" : ""
              }`}
              onClick={handleCopy}
            >
              {copied ? "✓ コピーしました" : "📋 コピー"}
            </button>

            {onEdit && (
              <button
                type="button"
                className="copy-ready-output-card__btn copy-ready-output-card__btn--edit"
                onClick={() => onEdit(data)}
              >
                ✏️ 編集
              </button>
            )}

            {isEmailTemplate && onSendEmail && (
              <button
                type="button"
                className="copy-ready-output-card__btn copy-ready-output-card__btn--send"
                onClick={() => onSendEmail(data)}
              >
                📧 メール送信
              </button>
            )}
          </div>

          {/* 生成情報 */}
          <div className="copy-ready-output-card__meta">
            <span className="copy-ready-output-card__timestamp">
              生成: {new Date(data.generatedAt).toLocaleString("ja-JP")}
            </span>
            {Object.keys(data.filledPlaceholders).length > 0 && (
              <span className="copy-ready-output-card__filled-count">
                {Object.keys(data.filledPlaceholders).length}項目を自動入力
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * テンプレート選択カード
 *
 * 利用可能なテンプレートをユーザーに提示する
 */
type TemplateOption = {
  id: string;
  name: string;
  icon: string;
  description: string;
  confidence?: number;
  reason?: string;
};

type TemplateSuggestionCardProps = {
  /** 推薦されたテンプレート */
  suggestions: TemplateOption[];
  /** テンプレート選択時のコールバック */
  onSelect: (templateId: string) => void;
  /** カード閉じるボタンクリック時のコールバック */
  onDismiss?: () => void;
};

export function TemplateSuggestionCard({
  suggestions,
  onSelect,
  onDismiss,
}: TemplateSuggestionCardProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="template-suggestion-card">
      <div className="template-suggestion-card__header">
        <span className="template-suggestion-card__icon">💡</span>
        <span className="template-suggestion-card__title">
          以下のテンプレートを使用できます
        </span>
        {onDismiss && (
          <button
            type="button"
            className="template-suggestion-card__dismiss"
            onClick={onDismiss}
            title="閉じる"
          >
            ✕
          </button>
        )}
      </div>

      <div className="template-suggestion-card__options">
        {suggestions.map((template) => (
          <button
            key={template.id}
            type="button"
            className="template-suggestion-card__option"
            onClick={() => onSelect(template.id)}
          >
            <span className="template-suggestion-card__option-icon">
              {template.icon}
            </span>
            <div className="template-suggestion-card__option-info">
              <span className="template-suggestion-card__option-name">
                {template.name}
              </span>
              <span className="template-suggestion-card__option-desc">
                {template.description}
              </span>
              {template.reason && (
                <span className="template-suggestion-card__option-reason">
                  {template.reason}
                </span>
              )}
            </div>
            {template.confidence !== undefined && (
              <span className="template-suggestion-card__option-confidence">
                {Math.round(template.confidence * 100)}%
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default CopyReadyOutputCard;
