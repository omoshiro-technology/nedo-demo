"use client"
import { useState, useRef, useEffect } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "こんにちは！AIエージェントのRe:Quidです。何かお手伝いできることはありますか？\n\n例えば：\n・報告書の分析について相談\n・過去の事例を探したい\n・日報の書き方を教えて"
};

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // メッセージ追加時に最下部にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // チャットを開いた時に入力欄にフォーカス
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // シンプルなローカル応答（将来的にはAPIに接続）
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: generateLocalResponse(trimmed)
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fab-chat">
      {isOpen && (
        <>
          <div className="fab-chat__panel">
            <div className="fab-chat__header">
              <div className="fab-chat__header-info">
                <span className="fab-chat__avatar">AI</span>
                <span className="fab-chat__title">Re:Quid</span>
              </div>
              <button
                type="button"
                className="fab-chat__close"
                onClick={() => setIsOpen(false)}
                aria-label="閉じる"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="fab-chat__messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`fab-chat__message fab-chat__message--${msg.role}`}
                >
                  {msg.role === "assistant" && (
                    <span className="fab-chat__message-avatar">AI</span>
                  )}
                  <div className="fab-chat__message-content">
                    {msg.content.split("\n").map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < msg.content.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="fab-chat__message fab-chat__message--assistant">
                  <span className="fab-chat__message-avatar">AI</span>
                  <div className="fab-chat__message-content fab-chat__typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="fab-chat__input-area">
              <input
                ref={inputRef}
                type="text"
                className="fab-chat__input"
                placeholder="メッセージを入力..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <button
                type="button"
                className="fab-chat__send"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                aria-label="送信"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
          <div
            className="fab-chat__backdrop"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        </>
      )}

      <button
        type="button"
        className="fab-chat__button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "チャットを閉じる" : "AIアシスタントに相談"}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}

// シンプルなローカル応答生成（将来的にはAPIに置き換え）
function generateLocalResponse(input: string): string {
  const lower = input.toLowerCase();

  if (lower.includes("分析") || lower.includes("報告書") || lower.includes("ナレッジ")) {
    return "報告書の分析は「ナレッジ抽出」から行えますよ。\n\nPDFやWord文書をアップロードすると、私が自動的に構造化して、欠損している情報を検出します。\n\nホーム画面の「ナレッジ抽出」カードをクリックしてお試しください。";
  }

  if (lower.includes("日報") || lower.includes("記録") || lower.includes("書く")) {
    return "日報機能は現在開発中です。\n\n完成すると、毎日の気づきやヒヤリハットを30秒で記録できるようになりますよ。音声入力にも対応予定です。楽しみにしていてください！";
  }

  if (lower.includes("検索") || lower.includes("過去") || lower.includes("事例") || lower.includes("探")) {
    return "過去の類似事例を探す「過去に学ぶ」機能は開発中です。\n\n完成すると、過去に記録した判断や分析結果から、今直面している問題に似た事例を私が見つけ出せるようになります。";
  }

  if (lower.includes("使い方") || lower.includes("ヘルプ") || lower.includes("help")) {
    return "ComPathの使い方をご説明しますね。\n\n1. **ナレッジ抽出**: 報告書をアップロードして知見を構造化\n2. **日報を書く**: 毎日の気づきを記録（開発中）\n3. **過去に学ぶ**: 類似事例を検索（開発中）\n\nまずは「ナレッジ抽出」から始めてみてください！私がサポートします。";
  }

  if (lower.includes("re:quid") || lower.includes("requid") || lower.includes("あなた") || lower.includes("誰")) {
    return "私はRe:Quidです。ComPathの中で皆さんの意思決定をサポートするAIエージェントです。\n\n報告書の分析や、過去の知見の検索など、ナレッジマネジメントに関することなら何でもお手伝いしますよ。";
  }

  return "ご質問ありがとうございます。\n\n私Re:Quidは、以下のことでお手伝いできます：\n・報告書の分析方法について\n・機能の使い方について\n・その他のご質問\n\n詳しく教えていただければ、より具体的にお答えしますね。";
}
