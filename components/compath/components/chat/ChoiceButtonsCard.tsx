"use client"
/**
 * 選択肢ボタンカード
 *
 * AIの回答に含まれる選択肢（①②③...）をボタンとして表示し、
 * ワンクリックで選択できるUI
 */
import { useState } from "react";

export type Choice = {
  /** 選択肢の番号（①②③...） */
  number: string;
  /** 選択肢のラベル */
  label: string;
  /** 選択肢の説明（あれば） */
  description?: string;
};

type ChoiceButtonsCardProps = {
  /** 抽出された選択肢リスト */
  choices: Choice[];
  /** 選択時のコールバック（選択肢のラベルを送信） */
  onSelect: (choice: Choice) => void;
  /** カードが非表示になっているか */
  isDismissed?: boolean;
  /** 「その他」選択時のコールバック */
  onSelectOther?: (customInput: string) => void;
};

export function ChoiceButtonsCard({
  choices,
  onSelect,
  isDismissed,
  onSelectOther,
}: ChoiceButtonsCardProps) {
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherInput, setOtherInput] = useState("");

  if (isDismissed || choices.length === 0) {
    return null;
  }

  const handleOtherSubmit = () => {
    if (otherInput.trim() && onSelectOther) {
      onSelectOther(otherInput.trim());
      setOtherInput("");
      setShowOtherInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleOtherSubmit();
    }
  };

  return (
    <div className="choice-buttons-card">
      <div className="choice-buttons-card__header">
        <span className="choice-buttons-card__icon">👆</span>
        <span className="choice-buttons-card__title">クリックで選択 → AIが詳しく案内します</span>
      </div>

      <div className="choice-buttons-card__buttons">
        {choices.map((choice) => (
          <button
            key={choice.number}
            type="button"
            className="choice-buttons-card__btn"
            onClick={() => onSelect(choice)}
            title={choice.description}
          >
            <span className="choice-buttons-card__btn-label">{choice.label}</span>
          </button>
        ))}

        {/* その他ボタン */}
        {onSelectOther && !showOtherInput && (
          <button
            type="button"
            className="choice-buttons-card__btn choice-buttons-card__btn--other"
            onClick={() => setShowOtherInput(true)}
          >
            <span className="choice-buttons-card__btn-label">その他...</span>
          </button>
        )}
      </div>

      {/* その他入力フィールド */}
      {showOtherInput && (
        <div className="choice-buttons-card__other-input">
          <input
            type="text"
            value={otherInput}
            onChange={(e) => setOtherInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="自由入力..."
            className="choice-buttons-card__input"
            autoFocus
          />
          <div className="choice-buttons-card__other-actions">
            <button
              type="button"
              className="choice-buttons-card__other-btn choice-buttons-card__other-btn--submit"
              onClick={handleOtherSubmit}
              disabled={!otherInput.trim()}
            >
              送信
            </button>
            <button
              type="button"
              className="choice-buttons-card__other-btn choice-buttons-card__other-btn--cancel"
              onClick={() => {
                setShowOtherInput(false);
                setOtherInput("");
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * AI応答から選択肢を抽出する
 *
 * 対応フォーマット:
 * - ①選択肢A ②選択肢B ③選択肢C（インライン形式）
 * - ①選択肢A　②選択肢B　③選択肢C（全角スペース区切り）
 * - 改行区切り
 * - 文中に埋め込まれた選択肢（「①安全性 ②運用性 ③品質」など）
 *
 * 抽出ルール:
 * - テキスト全体から①②③...のパターンを検索
 * - 連続した丸数字のブロックのみ（①②③...の順序で連続しているもの）
 * - 最大7個まで
 *
 * @param content AI応答の全文
 * @returns 抽出された選択肢リスト
 */
export function extractChoicesFromResponse(content: string): Choice[] {
  const choices: Choice[] = [];

  // 丸数字パターン: ①〜⑳
  const circledNumbers = [
    "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩",
    "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳",
  ];

  // まず①が存在するか確認
  if (!content.includes("①")) {
    return [];
  }

  // ①の位置から選択肢ブロックを探す
  const firstChoiceIndex = content.indexOf("①");

  // ①以降のテキストを取得（ただし見出しや水平線があればそこまで）
  let choiceBlock = content.slice(firstChoiceIndex);

  // 見出し（##）や水平線（---）があれば、そこで終了
  const headingMatch = choiceBlock.match(/\n##|\n-{3,}|\n\*{3,}|\n_{3,}/);
  if (headingMatch?.index) {
    choiceBlock = choiceBlock.slice(0, headingMatch.index);
  }

  // 選択肢のパターン: ①ラベル（次の丸数字または改行2つまたは文末まで）
  // より柔軟に：丸数字の後、次の丸数字/文末/改行2つ/句点+改行まで
  const choicePattern = new RegExp(
    `([${circledNumbers.join("")}])([^${circledNumbers.join("")}]+?)(?=[${circledNumbers.join("")}]|$|\\n\\n|。\\s*$)`,
    "g"
  );

  let match;
  let expectedNumber = 1;

  while ((match = choicePattern.exec(choiceBlock)) !== null) {
    const number = match[1];
    const numberIndex = circledNumbers.indexOf(number) + 1;

    // 連続性チェック
    if (numberIndex !== expectedNumber) {
      // ①から再開する場合はリセット
      if (numberIndex === 1 && choices.length > 0) {
        break;
      }
      continue;
    }

    let fullText = match[2].trim();

    // 改行を含む場合は最初の行のみ使用（複数行の説明を避ける）
    const firstLineMatch = fullText.match(/^([^\n]+)/);
    if (firstLineMatch) {
      fullText = firstLineMatch[1].trim();
    }

    // 末尾の句読点・括弧を除去
    fullText = fullText.replace(/[。、,.」』）\)]+$/, "").trim();

    // 空や極端に短い場合はスキップ
    if (!fullText || fullText.length < 2) {
      continue;
    }

    let label = fullText;
    let description: string | undefined;

    // 括弧で説明が付いている場合を抽出
    const descMatch = fullText.match(/^(.+?)[（(](.+?)[）)](.*)$/);
    if (descMatch) {
      label = descMatch[1].trim();
      description = descMatch[2].trim();
      if (descMatch[3].trim()) {
        description += " " + descMatch[3].trim();
      }
    }

    // **マークダウン記法を除去（ボタン表示用）
    const cleanLabel = label
      .replace(/\*\*([^*]+)\*\*/g, "$1")  // **text** → text
      .replace(/\s+/g, " ")
      .trim();

    if (cleanLabel) {
      choices.push({
        number,
        label: cleanLabel,
        description,
      });
      expectedNumber++;
    }

    if (choices.length >= 7) break;
  }

  // 最低2つの選択肢がない場合は空配列を返す
  if (choices.length < 2) {
    return [];
  }

  return choices;
}

/**
 * 選択肢が含まれているかチェック
 * 最低2つ以上の選択肢がある場合にtrueを返す
 */
export function hasChoices(content: string): boolean {
  const choices = extractChoicesFromResponse(content);
  return choices.length >= 2;
}

/**
 * AI応答から選択肢テキストを除去する
 *
 * 選択肢がボタンUIとして表示される場合、本文から選択肢テキストを除去して
 * 重複表示を防ぐ
 *
 * @param content AI応答の全文
 * @returns 選択肢テキストを除去した本文
 */
export function removeChoicesFromContent(content: string): string {
  // 丸数字パターン: ①〜⑳
  const circledNumbers = [
    "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩",
    "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳",
  ];

  // ①が存在しなければそのまま返す
  if (!content.includes("①")) {
    return content;
  }

  // 選択肢が2つ以上あるか確認
  const choices = extractChoicesFromResponse(content);
  if (choices.length < 2) {
    return content;
  }

  // 選択肢ブロックを検出して除去
  // パターン1: 括弧内の選択肢 （①A ②B ③C）
  let result = content.replace(/[（(][^）)]*①[^）)]+[）)]/g, "");

  // パターン2: 行末の選択肢リスト（①A ②B ③C）
  // ①から始まり、複数の丸数字が続く部分を除去
  const inlineChoicePattern = new RegExp(
    `①[^${circledNumbers.join("")}\\n]+(?:[${circledNumbers.slice(1).join("")}][^${circledNumbers.join("")}\\n]+)*`,
    "g"
  );
  result = result.replace(inlineChoicePattern, "");

  // 空行が複数連続した場合は1つにまとめる
  result = result.replace(/\n{3,}/g, "\n\n");

  // 末尾の空白・改行を除去
  result = result.trim();

  return result;
}
