"use client"
/**
 * 提案書プレビュー (Step 3)
 * Phase 28: 営業向け提案書作成支援
 */

import { useState } from "react";
import type { GeneratedProposal, ProposalOption } from "../../types/proposal";

type Props = {
  proposal: GeneratedProposal | null;
  isGenerating: boolean;
  error?: string;
  onRegenerate: () => void;
};

export function ProposalPreview({
  proposal,
  isGenerating,
  error,
  onRegenerate,
}: Props) {
  const [copied, setCopied] = useState(false);

  if (isGenerating) {
    return (
      <div className="proposal-preview__loading">
        <div className="proposal-preview__spinner" />
        <div className="proposal-preview__loading-text">
          提案書を生成しています...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="proposal-preview">
        <div className="proposal-preview__error">{error}</div>
        <div className="proposal-preview__actions">
          <button
            className="proposal-preview__action-btn proposal-preview__action-btn--regenerate"
            onClick={onRegenerate}
          >
            再生成
          </button>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return null;
  }

  const handleCopy = async () => {
    const text = formatProposalAsText(proposal);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const renderOption = (option: ProposalOption) => (
    <div
      key={option.id}
      className={`proposal-preview__option ${
        option.isRecommended ? "proposal-preview__option--recommended" : ""
      }`}
    >
      <div className="proposal-preview__option-header">
        <span className="proposal-preview__option-title">
          案{option.id}: {option.name}
        </span>
        {option.isRecommended && (
          <span className="proposal-preview__option-badge">推奨</span>
        )}
      </div>
      <div className="proposal-preview__option-desc">{option.description}</div>
      <div className="proposal-preview__option-pros-cons">
        <div className="proposal-preview__option-list">
          <div className="proposal-preview__option-list-title">メリット</div>
          <ul>
            {option.pros.map((pro, i) => (
              <li key={i}>{pro}</li>
            ))}
          </ul>
        </div>
        <div className="proposal-preview__option-list">
          <div className="proposal-preview__option-list-title">デメリット</div>
          <ul>
            {option.cons.map((con, i) => (
              <li key={i}>{con}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="proposal-preview">
      {/* 1. 背景 */}
      <div className="proposal-preview__section">
        <div className="proposal-preview__section-title">1. 背景</div>
        <div className="proposal-preview__section-content">
          {proposal.background}
        </div>
      </div>

      {/* 2. 課題の再定義 */}
      <div className="proposal-preview__section">
        <div className="proposal-preview__section-title">2. 課題の再定義</div>
        <div className="proposal-preview__section-content">
          {proposal.problemRedefinition}
        </div>
      </div>

      {/* 3. 判断論点 */}
      <div className="proposal-preview__section">
        <div className="proposal-preview__section-title">3. 判断論点</div>
        <div className="proposal-preview__section-content">
          {proposal.evaluationPoints}
        </div>
      </div>

      {/* 4. 選択肢 */}
      <div className="proposal-preview__section">
        <div className="proposal-preview__section-title">
          4. 選択肢のご提案
        </div>
        <div className="proposal-preview__options">
          {renderOption(proposal.options.A)}
          {renderOption(proposal.options.B)}
          {renderOption(proposal.options.C)}
        </div>
      </div>

      {/* 5. 推奨案と理由 */}
      <div className="proposal-preview__section">
        <div className="proposal-preview__section-title">5. 推奨案と理由</div>
        <div className="proposal-preview__section-content">
          {proposal.recommendation}
        </div>
      </div>

      {/* 6. リスクの正直な開示 */}
      <div className="proposal-preview__section">
        <div className="proposal-preview__section-title">
          6. リスクの正直な開示
        </div>
        <div className="proposal-preview__risks">
          {proposal.risks.map((risk, i) => (
            <div key={i} className="proposal-preview__risk-item">
              <span className="proposal-preview__risk-icon">⚠</span>
              <span>{risk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 7. ご判断いただきたい点 */}
      <div className="proposal-preview__section">
        <div className="proposal-preview__section-title">
          7. ご判断いただきたい点
        </div>
        <div className="proposal-preview__section-content">
          {proposal.customerDecisionPoint}
        </div>
      </div>

      {/* アクション */}
      <div className="proposal-preview__actions">
        <button
          className="proposal-preview__action-btn proposal-preview__action-btn--copy"
          onClick={handleCopy}
        >
          コピー
        </button>
        <button
          className="proposal-preview__action-btn proposal-preview__action-btn--regenerate"
          onClick={onRegenerate}
        >
          再生成
        </button>
      </div>

      {copied && (
        <div className="proposal-preview__copied">
          クリップボードにコピーしました
        </div>
      )}
    </div>
  );
}

/**
 * 提案書をプレーンテキストに変換
 */
function formatProposalAsText(proposal: GeneratedProposal): string {
  const formatOption = (option: ProposalOption) => {
    const recommended = option.isRecommended ? "【推奨】" : "";
    const pros = option.pros.map((p) => `  - ${p}`).join("\n");
    const cons = option.cons.map((c) => `  - ${c}`).join("\n");
    return `### 案${option.id}: ${option.name} ${recommended}

${option.description}

**メリット:**
${pros}

**デメリット:**
${cons}`;
  };

  return `# ご提案書

## 1. 背景
${proposal.background}

## 2. 課題の再定義
${proposal.problemRedefinition}

## 3. 判断論点
${proposal.evaluationPoints}

## 4. 選択肢のご提案

${formatOption(proposal.options.A)}

${formatOption(proposal.options.B)}

${formatOption(proposal.options.C)}

## 5. 推奨案と理由
${proposal.recommendation}

## 6. リスクの正直な開示
${proposal.risks.map((r) => `- ${r}`).join("\n")}

## 7. ご判断いただきたい点
${proposal.customerDecisionPoint}
`;
}
