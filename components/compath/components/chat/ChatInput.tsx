"use client"
import { useState, useRef, useCallback, useEffect, type ChangeEvent, type KeyboardEvent } from "react";
import type { AgentType } from "../../types/chat";
import { CHAT_INPUT } from "../../constants/philosophy";

type ChatInputProps = {
  agentType: AgentType;
  isProcessing: boolean;
  onSendMessage: (message: string, files?: File[]) => void;
  /** 入力欄に事前入力するテキスト（AIアシスト用） */
  prefillText?: string;
  /** prefillTextがクリアされたことを通知 */
  onPrefillCleared?: () => void;
};

function getPlaceholder(agentType: AgentType): string {
  switch (agentType) {
    case "knowledge_extraction":
      return CHAT_INPUT.PLACEHOLDER_KNOWLEDGE_EXTRACTION;
    case "unified_analysis":
      return CHAT_INPUT.PLACEHOLDER_DECISION_TIMELINE;
    case "daily_report":
      return CHAT_INPUT.PLACEHOLDER_DAILY_REPORT;
    default:
      return CHAT_INPUT.PLACEHOLDER_DEFAULT;
  }
}

function getAcceptedFormats(agentType: AgentType): string {
  switch (agentType) {
    case "knowledge_extraction":
    case "unified_analysis":
      return ".pdf,.docx,.txt";
    default:
      return "";
  }
}

export default function ChatInput({ agentType, isProcessing, onSendMessage, prefillText, onPrefillCleared }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // prefillTextが設定されたら入力欄に反映
  useEffect(() => {
    if (prefillText) {
      setMessage(prefillText);
      onPrefillCleared?.();
      // textareaにフォーカスしてカーソルを末尾に
      // requestAnimationFrameを2回使用して、DOM更新後に高さを計算
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.selectionStart = textareaRef.current.value.length;
            textareaRef.current.selectionEnd = textareaRef.current.value.length;
            // 高さも調整
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
          }
        });
      });
    }
  }, [prefillText, onPrefillCleared]);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
    // Reset input to allow selecting same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSend = useCallback(() => {
    if (isProcessing) return;
    if (message.trim()) {
      onSendMessage(message.trim(), files.length > 0 ? files : undefined);
      setMessage("");
      setFiles([]);
      // 送信後にtextareaの高さを元に戻す
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [message, files, isProcessing, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl+Enter または Cmd+Enter で送信
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleTextareaChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = "auto";
    // 入力が空の場合は最小高さに戻す（min-heightはCSSで設定）
    if (value.trim()) {
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  const acceptedFormats = getAcceptedFormats(agentType);
  const showFileUpload = acceptedFormats !== "";

  return (
    <div className="chat-input">
      {/* File preview area */}
      {files.length > 0 && (
        <div className="chat-input__files">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="chat-input__file">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="chat-input__file-name">{file.name}</span>
              <button
                type="button"
                className="chat-input__file-remove"
                onClick={() => handleRemoveFile(index)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
          {/* Hint message when files are selected but no text */}
          {message.trim() === "" && (
            <div className="chat-input__hint">
              {CHAT_INPUT.FILE_HINT}
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="chat-input__row">
        {showFileUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedFormats}
              onChange={handleFileSelect}
              multiple
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="chat-input__attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              title="ファイルを添付"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
          </>
        )}

        <textarea
          ref={textareaRef}
          className="chat-input__textarea"
          placeholder={`${getPlaceholder(agentType)} (Ctrl+Enterで送信)`}
          value={message}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          rows={1}
        />

        <button
          type="button"
          className="chat-input__send-btn"
          onClick={handleSend}
          disabled={isProcessing || message.trim() === ""}
          title="送信"
        >
          {isProcessing ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chat-input__spinner">
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
