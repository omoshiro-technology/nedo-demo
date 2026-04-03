"use client"
/**
 * AI質問カード
 *
 * AIの回答に含まれる質問を分離して表示し、
 * ユーザーがワンクリックで回答/スキップを選択できるUI
 */

type AIQuestionCardProps = {
  /** 質問内容 */
  question: string;
  /** 回答するボタンのコールバック（質問文をプリフィルしてチャット入力に反映） */
  onAnswer: (question: string) => void;
  /** スキップボタンのコールバック */
  onSkip: () => void;
  /** カードが非表示になっているか */
  isDismissed?: boolean;
};

export function AIQuestionCard({
  question,
  onAnswer,
  onSkip,
  isDismissed,
}: AIQuestionCardProps) {
  if (isDismissed) {
    return null;
  }

  return (
    <div className="ai-question-card">
      <div className="ai-question-card__header">
        <span className="ai-question-card__icon">❓</span>
        <span className="ai-question-card__title">確認したいことがあります</span>
      </div>

      <div className="ai-question-card__content">
        <p className="ai-question-card__question">{question}</p>
      </div>

      <div className="ai-question-card__hint">
        <span>回答いただけると、より正確なアドバイスができます</span>
      </div>

      <div className="ai-question-card__actions">
        <button
          type="button"
          className="ai-question-card__btn ai-question-card__btn--primary"
          onClick={() => onAnswer(question)}
        >
          回答する
        </button>
        <button
          type="button"
          className="ai-question-card__btn ai-question-card__btn--secondary"
          onClick={onSkip}
        >
          後で
        </button>
      </div>
    </div>
  );
}

/**
 * AI応答から質問部分を抽出する
 *
 * システムプロンプトで指定したフォーマット:
 * ---
 * **確認させてください**
 * [質問内容]
 * ---
 *
 * @param content AI応答の全文
 * @returns { mainContent: 質問を除いた本文, question: 抽出された質問 | null }
 */
export function extractQuestionFromResponse(content: string): {
  mainContent: string;
  question: string | null;
} {
  // "**確認させてください**" パターンを検出
  // 複数のパターンに対応:
  // 1. --- で囲まれたブロック
  // 2. **確認させてください** で始まるセクション
  const patterns = [
    // パターン1: ---で囲まれたブロック（確認させてください含む）
    /\n*---\s*\n+\*\*確認させてください\*\*\s*\n+([\s\S]*?)\n*---\s*$/,
    // パターン2: ---の後に確認させてください（末尾の---なし）
    /\n*---\s*\n+\*\*確認させてください\*\*\s*\n+([\s\S]+?)$/,
    // パターン3: 確認させてくださいで始まるセクション（hrなし）
    /\n*\*\*確認させてください\*\*\s*\n+([\s\S]+?)$/,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const question = match[1].trim();
      const mainContent = content.replace(match[0], "").trim();
      return { mainContent, question };
    }
  }

  return { mainContent: content, question: null };
}
