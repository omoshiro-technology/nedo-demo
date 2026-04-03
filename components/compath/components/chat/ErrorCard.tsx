"use client"
/**
 * エラーカード
 *
 * エラーが発生した際にユーザーフレンドリーなメッセージと
 * 再試行ボタンを表示するコンポーネント
 */

type ErrorCardProps = {
  /** エラーメッセージ */
  message: string;
  /** 再試行時のコールバック */
  onRetry?: () => void;
  /** 閉じる時のコールバック */
  onDismiss?: () => void;
  /** カードが非表示になっているか */
  isDismissed?: boolean;
};

/**
 * エラーメッセージをユーザーフレンドリーに変換
 */
export function formatErrorMessage(message: string): {
  title: string;
  description: string;
  isRetryable: boolean;
} {
  // 一時的なエラー（リトライ可能）
  if (
    message.includes("一時的に利用できません") ||
    message.includes("応答が空でした") ||
    message.includes("再試行してください")
  ) {
    return {
      title: "処理に時間がかかっています",
      description: "AIサービスが混雑しているようです。もう一度お試しください。",
      isRetryable: true,
    };
  }

  // ネットワークエラー
  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("Failed to fetch")
  ) {
    return {
      title: "接続できませんでした",
      description: "ネットワーク接続を確認して、もう一度お試しください。",
      isRetryable: true,
    };
  }

  // Rate limit
  if (message.includes("429") || message.includes("rate limit")) {
    return {
      title: "リクエスト数の上限に達しました",
      description: "しばらく待ってから再度お試しください。",
      isRetryable: true,
    };
  }

  // APIキー関連
  if (message.includes("API_KEY") || message.includes("401") || message.includes("403")) {
    return {
      title: "認証エラー",
      description: "設定に問題がある可能性があります。管理者にお問い合わせください。",
      isRetryable: false,
    };
  }

  // その他のエラー
  return {
    title: "エラーが発生しました",
    description: message,
    isRetryable: true,
  };
}

export function ErrorCard({
  message,
  onRetry,
  onDismiss,
  isDismissed,
}: ErrorCardProps) {
  if (isDismissed) {
    return null;
  }

  const { title, description, isRetryable } = formatErrorMessage(message);

  return (
    <div className="error-card">
      <div className="error-card__header">
        <span className="error-card__icon">⚠️</span>
        <span className="error-card__title">{title}</span>
      </div>

      <div className="error-card__content">
        <p className="error-card__description">{description}</p>
      </div>

      <div className="error-card__actions">
        {isRetryable && onRetry && (
          <button
            type="button"
            className="error-card__btn error-card__btn--primary"
            onClick={onRetry}
          >
            再試行
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            className="error-card__btn error-card__btn--secondary"
            onClick={onDismiss}
          >
            閉じる
          </button>
        )}
      </div>
    </div>
  );
}
