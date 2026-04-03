"use client"
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import type { DecisionChatMessage } from "../../types/decisionNavigator";

type DecisionNavigatorChatProps = {
  messages: DecisionChatMessage[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
};

export function DecisionNavigatorChat({
  messages,
  onSendMessage,
  isProcessing,
}: DecisionNavigatorChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [isComposing, setIsComposing] = useState(false); // IME変換中フラグ
  const [isBouncing, setIsBouncing] = useState(false); // アイコン跳ねアニメーション
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);

  // メッセージ追加時に自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 新しいAIメッセージが追加された時にアイコンを跳ねさせる
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const isNewMessage = messages.length > prevMessageCountRef.current;

    if (isNewMessage && lastMessage?.role === "assistant") {
      setIsBouncing(true);
      // 2秒後にアニメーションを止める
      const timer = setTimeout(() => {
        setIsBouncing(false);
      }, 2000);
      return () => clearTimeout(timer);
    }

    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing) return;
    onSendMessage(inputValue.trim());
    setInputValue("");
  };

  // IME変換開始
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  // IME変換終了（遅延してフラグをリセット）
  const handleCompositionEnd = () => {
    // compositionend は keydown の後に発火するため、
    // 少し遅延させてから isComposing を false にする
    // 50msに増加（一部ブラウザで10msでは不十分）
    setTimeout(() => {
      setIsComposing(false);
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // IME変換中は送信しない
    // 1. isComposing: Reactのstate（compositionstart/endで管理）
    // 2. nativeEvent.isComposing: ブラウザネイティブのフラグ
    // 3. key === 'Process': IME処理中のキー（一部ブラウザ）
    // 4. keyCode === 229: IME入力中（Chrome/Safari on Mac）
    if (
      isComposing ||
      e.nativeEvent.isComposing ||
      e.key === "Process" ||
      e.keyCode === 229
    ) {
      return;
    }

    // Ctrl+Enter または Cmd+Enter で送信
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
      return;
    }

    // 通常のEnter（Shiftなし）でも送信
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Shift+Enter は改行（デフォルト動作）
  };

  return (
    <div className="dn-chat">
      {/* ヘッダー */}
      <div className={`dn-chat__header ${isBouncing ? "dn-chat__header--bounce" : ""}`}>
        <div className="dn-chat__header-left">
          <svg
            className={`dn-chat__header-icon ${isBouncing ? "dn-chat__header-icon--bounce" : ""}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>AIアシスタント</span>
        </div>
        <button
          type="button"
          className="dn-chat__docs-button"
          onClick={() => window.open("/documents", "_blank")}
          title="手順書・解説書を参照"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>手順書・解説書</span>
        </button>
      </div>

      {/* メッセージ一覧 */}
      <div className="dn-chat__messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`dn-chat__message dn-chat__message--${message.role}`}
          >
            {/* アバター */}
            <div className="dn-chat__avatar">
              {message.role === "assistant" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              ) : (
                <span>U</span>
              )}
            </div>
            {/* メッセージ本体 */}
            <div className="dn-chat__body">
              <div className="dn-chat__bubble">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {message.content}
                </ReactMarkdown>
              </div>
              <span className="dn-chat__time">
                {new Date(message.timestamp).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}

        {/* 処理中インジケーター */}
        {isProcessing && (
          <div className="dn-chat__message dn-chat__message--assistant">
            <div className="dn-chat__avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="dn-chat__body">
              <div className="dn-chat__bubble">
                <span className="dn-chat__typing">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 入力フォーム */}
      <form className="dn-chat__input" onSubmit={handleSubmit}>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder="選択肢について質問..."
          disabled={isProcessing}
          rows={1}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isProcessing}
          title="送信"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
