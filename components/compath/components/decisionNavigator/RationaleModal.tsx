"use client"
import { useState, useCallback } from "react";

/** デフォルトの選択理由プリセット */
const DEFAULT_RATIONALE_OPTIONS = [
  "リスクが低い",
  "コストが最適",
  "過去の実績がある",
];

type RationaleModalProps = {
  nodeLabel: string;
  onConfirm: (rationale: string) => void;
  onCancel: () => void;
  isProcessing?: boolean;
};

export function RationaleModal({
  nodeLabel,
  onConfirm,
  onCancel,
  isProcessing = false,
}: RationaleModalProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [customRationale, setCustomRationale] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const handleOptionChange = useCallback((option: string) => {
    setSelectedOption(option);
    setIsCustom(false);
    setCustomRationale("");
  }, []);

  const handleCustomSelect = useCallback(() => {
    setSelectedOption(null);
    setIsCustom(true);
  }, []);

  const handleConfirm = useCallback(() => {
    const rationale = isCustom ? customRationale.trim() : selectedOption;
    if (rationale) {
      onConfirm(rationale);
    }
  }, [isCustom, customRationale, selectedOption, onConfirm]);

  const isValid = isCustom ? customRationale.trim().length > 0 : selectedOption !== null;

  return (
    <div className="dn-rationale-modal-overlay" onClick={onCancel}>
      <div className="dn-rationale-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dn-rationale-modal__header">
          <h3>選択理由を選んでください</h3>
          <p className="dn-rationale-modal__subtitle">
            「{nodeLabel}」を選択する理由
          </p>
        </div>

        <div className="dn-rationale-modal__options">
          {DEFAULT_RATIONALE_OPTIONS.map((option) => (
            <label key={option} className="dn-rationale-modal__option">
              <input
                type="radio"
                name="rationale"
                checked={selectedOption === option && !isCustom}
                onChange={() => handleOptionChange(option)}
                disabled={isProcessing}
              />
              <span>{option}</span>
            </label>
          ))}

          <label className="dn-rationale-modal__option dn-rationale-modal__option--custom">
            <input
              type="radio"
              name="rationale"
              checked={isCustom}
              onChange={handleCustomSelect}
              disabled={isProcessing}
            />
            <span>その他（入力）</span>
          </label>

          {isCustom && (
            <div className="dn-rationale-modal__custom-input">
              <input
                type="text"
                value={customRationale}
                onChange={(e) => setCustomRationale(e.target.value)}
                placeholder="理由を入力してください"
                autoFocus
                disabled={isProcessing}
              />
            </div>
          )}
        </div>

        <div className="dn-rationale-modal__actions">
          <button
            type="button"
            className="dn-rationale-modal__btn dn-rationale-modal__btn--cancel"
            onClick={onCancel}
            disabled={isProcessing}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="dn-rationale-modal__btn dn-rationale-modal__btn--confirm"
            onClick={handleConfirm}
            disabled={!isValid || isProcessing}
          >
            {isProcessing ? "処理中..." : "確定"}
          </button>
        </div>
      </div>
    </div>
  );
}
