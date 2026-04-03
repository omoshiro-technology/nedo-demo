"use client"
/**
 * 提案書結果カード（チャット埋め込み用）
 * Phase 28: 営業向け提案書作成支援
 */

import { useState } from "react";
import type { ProposalResultData } from "../../types/chat";
import type { ProposalOption } from "../../types/proposal";

type Props = {
  data: ProposalResultData;
  onRegenerate: () => void;
};

export function ProposalResultCard({ data, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { generatedProposal, customerContext } = data;

  const handleCopy = async () => {
    const text = formatProposalAsText(generatedProposal, customerContext.name);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownloadPptx = async () => {
    setIsExporting(true);
    try {
      // pptxgenjs を動的インポート
      const pptxgen = await import("pptxgenjs");
      const PptxGenJS = pptxgen.default;

      const pres = new PptxGenJS();
      pres.layout = "LAYOUT_16x9";
      pres.title = `${customerContext.name} 様 ご提案書`;

      // スライド1: 表紙
      const slide1 = pres.addSlide();
      slide1.addText(`${customerContext.name} 様`, {
        x: 0.5,
        y: 2,
        w: "90%",
        h: 1,
        fontSize: 32,
        bold: true,
        color: "1f2937",
        align: "center",
      });
      slide1.addText("ご提案書", {
        x: 0.5,
        y: 3,
        w: "90%",
        h: 0.8,
        fontSize: 24,
        color: "4b5563",
        align: "center",
      });
      // 提案の位置づけ（あれば）
      if (generatedProposal.positioning) {
        slide1.addText(generatedProposal.positioning, {
          x: 0.5,
          y: 3.8,
          w: "90%",
          h: 0.6,
          fontSize: 12,
          color: "6b7280",
          align: "center",
        });
      }
      slide1.addText(new Date().toLocaleDateString("ja-JP"), {
        x: 0.5,
        y: 4.5,
        w: "90%",
        h: 0.5,
        fontSize: 14,
        color: "6b7280",
        align: "center",
      });

      // スライド2: 背景
      const slide2 = pres.addSlide();
      addSlideTitle(slide2, "1. 背景");
      slide2.addText(generatedProposal.background, {
        x: 0.5,
        y: 1.2,
        w: "90%",
        h: 3.5,
        fontSize: 14,
        color: "374151",
        valign: "top",
      });

      // スライド3: 課題の再定義
      const slide3 = pres.addSlide();
      addSlideTitle(slide3, "2. 課題の再定義");
      slide3.addText(generatedProposal.problemRedefinition, {
        x: 0.5,
        y: 1.2,
        w: "90%",
        h: 3.5,
        fontSize: 14,
        color: "374151",
        valign: "top",
      });

      // スライド4: 判断論点
      const slide4 = pres.addSlide();
      addSlideTitle(slide4, "3. 判断論点");
      slide4.addText(generatedProposal.evaluationPoints, {
        x: 0.5,
        y: 1.2,
        w: "90%",
        h: 3.5,
        fontSize: 14,
        color: "374151",
        valign: "top",
      });

      // スライド5: 選択肢一覧
      const slide5 = pres.addSlide();
      addSlideTitle(slide5, "4. 選択肢のご提案");

      const options = [
        generatedProposal.options.A,
        generatedProposal.options.B,
        generatedProposal.options.C,
      ];

      options.forEach((option, index) => {
        const yPos = 1.2 + index * 1.5;
        const bgColor = option.isRecommended ? "eff6ff" : "f9fafb";

        slide5.addShape("rect", {
          x: 0.5,
          y: yPos,
          w: "90%",
          h: 1.3,
          fill: { color: bgColor },
          line: { color: option.isRecommended ? "3b82f6" : "e5e7eb", pt: 1 },
        });

        slide5.addText(`案${option.id}: ${option.name}${option.isRecommended ? " 【推奨】" : ""}`, {
          x: 0.7,
          y: yPos + 0.1,
          w: "85%",
          h: 0.4,
          fontSize: 14,
          bold: true,
          color: "1f2937",
        });

        slide5.addText(option.description.slice(0, 150) + (option.description.length > 150 ? "..." : ""), {
          x: 0.7,
          y: yPos + 0.5,
          w: "85%",
          h: 0.7,
          fontSize: 11,
          color: "4b5563",
          valign: "top",
        });
      });

      // スライド6: 推奨案と理由
      const slide6 = pres.addSlide();
      addSlideTitle(slide6, "5. 推奨案と理由");
      slide6.addText(generatedProposal.recommendation, {
        x: 0.5,
        y: 1.2,
        w: "90%",
        h: 3.5,
        fontSize: 14,
        color: "374151",
        valign: "top",
      });

      // スライド7: Before/After（あれば）
      if (generatedProposal.beforeAfter) {
        const slideBA = pres.addSlide();
        addSlideTitle(slideBA, "6. 導入効果（Before/After）");
        slideBA.addText("Before（現状）", {
          x: 0.5,
          y: 1.2,
          w: "45%",
          h: 0.4,
          fontSize: 14,
          bold: true,
          color: "dc2626",
        });
        slideBA.addText(generatedProposal.beforeAfter.before, {
          x: 0.5,
          y: 1.6,
          w: "45%",
          h: 2.5,
          fontSize: 12,
          color: "374151",
          valign: "top",
        });
        slideBA.addText("After（導入後）", {
          x: 5.2,
          y: 1.2,
          w: "45%",
          h: 0.4,
          fontSize: 14,
          bold: true,
          color: "16a34a",
        });
        slideBA.addText(generatedProposal.beforeAfter.after, {
          x: 5.2,
          y: 1.6,
          w: "45%",
          h: 2.5,
          fontSize: 12,
          color: "374151",
          valign: "top",
        });
      }

      // スライド8: リスクの開示
      const slideRisks = pres.addSlide();
      addSlideTitle(slideRisks, "7. リスクの正直な開示");
      const risksText = generatedProposal.risks.map((r, i) => `${i + 1}. ${r}`).join("\n\n");
      slideRisks.addText(risksText, {
        x: 0.5,
        y: 1.2,
        w: "90%",
        h: 3.5,
        fontSize: 14,
        color: "b45309",
        valign: "top",
      });

      // スライド9: 必要データ（あれば）
      if (generatedProposal.dataRequirements && generatedProposal.dataRequirements.length > 0) {
        const slideData = pres.addSlide();
        addSlideTitle(slideData, "8. 次ステップで必要なデータ");
        const dataText = generatedProposal.dataRequirements.map((d, i) => `${i + 1}. ${d}`).join("\n\n");
        slideData.addText(dataText, {
          x: 0.5,
          y: 1.2,
          w: "90%",
          h: 3.5,
          fontSize: 14,
          color: "374151",
          valign: "top",
        });
      }

      // スライド最終: ご判断いただきたい点
      const slideFinal = pres.addSlide();
      addSlideTitle(slideFinal, "9. ご判断いただきたい点");
      slideFinal.addText(generatedProposal.customerDecisionPoint, {
        x: 0.5,
        y: 1.2,
        w: "90%",
        h: 3.5,
        fontSize: 14,
        color: "374151",
        valign: "top",
      });

      // ファイル名を生成してダウンロード
      const fileName = `提案書_${customerContext.name}_${new Date().toISOString().slice(0, 10)}`;
      await pres.writeFile({ fileName });
    } catch (err) {
      console.error("Failed to export PPTX:", err);
      alert("PowerPointの生成に失敗しました。");
    } finally {
      setIsExporting(false);
    }
  };

  const renderOption = (option: ProposalOption) => (
    <div
      key={option.id}
      className={`proposal-result-card__option ${
        option.isRecommended ? "proposal-result-card__option--recommended" : ""
      }`}
    >
      <div className="proposal-result-card__option-header">
        <span className="proposal-result-card__option-title">
          案{option.id}: {option.name}
        </span>
        {option.isRecommended && (
          <span className="proposal-result-card__option-badge">推奨</span>
        )}
      </div>
      <div className="proposal-result-card__option-desc">{option.description}</div>
      <div className="proposal-result-card__option-pros-cons">
        <div className="proposal-result-card__option-list">
          <div className="proposal-result-card__option-list-title">メリット</div>
          <ul>
            {option.pros.map((pro, i) => (
              <li key={i}>{pro}</li>
            ))}
          </ul>
        </div>
        <div className="proposal-result-card__option-list">
          <div className="proposal-result-card__option-list-title">デメリット</div>
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
    <div className="proposal-result-card">
      <div className="proposal-result-card__header">
        <h4 className="proposal-result-card__title">
          {customerContext.name} 様 ご提案書
        </h4>
      </div>

      <div className="proposal-result-card__body">
        {/* 0. 提案の位置づけ */}
        {generatedProposal.positioning && (
          <div className="proposal-result-card__positioning">
            {generatedProposal.positioning}
          </div>
        )}

        {/* 1. 背景 */}
        <div className="proposal-result-card__section">
          <div className="proposal-result-card__section-title">1. 背景</div>
          <div className="proposal-result-card__section-content">
            {generatedProposal.background}
          </div>
        </div>

        {/* 2. 課題の再定義 */}
        <div className="proposal-result-card__section">
          <div className="proposal-result-card__section-title">2. 課題の再定義</div>
          <div className="proposal-result-card__section-content">
            {generatedProposal.problemRedefinition}
          </div>
        </div>

        {/* 3. 判断論点 */}
        <div className="proposal-result-card__section">
          <div className="proposal-result-card__section-title">3. 判断論点</div>
          <div className="proposal-result-card__section-content proposal-result-card__section-content--evaluation">
            {formatEvaluationPoints(generatedProposal.evaluationPoints)}
          </div>
        </div>

        {/* 4. 選択肢 */}
        <div className="proposal-result-card__section">
          <div className="proposal-result-card__section-title">
            4. 選択肢のご提案
          </div>
          <div className="proposal-result-card__options">
            {renderOption(generatedProposal.options.A)}
            {renderOption(generatedProposal.options.B)}
            {renderOption(generatedProposal.options.C)}
          </div>
        </div>

        {/* 5. 推奨案と理由 */}
        <div className="proposal-result-card__section">
          <div className="proposal-result-card__section-title">5. 推奨案と理由</div>
          <div className="proposal-result-card__section-content">
            {generatedProposal.recommendation}
          </div>
        </div>

        {/* 6. A案を採用しない理由 */}
        {generatedProposal.whyNotOptionA && (
          <div className="proposal-result-card__section">
            <div className="proposal-result-card__section-title">6. A案を今回採用しない理由</div>
            <div className="proposal-result-card__section-content">
              {generatedProposal.whyNotOptionA}
            </div>
          </div>
        )}

        {/* 7. Before/After */}
        {generatedProposal.beforeAfter && (
          <div className="proposal-result-card__section">
            <div className="proposal-result-card__section-title">7. 導入効果（Before/After）</div>
            <div className="proposal-result-card__before-after">
              <div className="proposal-result-card__before">
                <div className="proposal-result-card__ba-label">Before（現状）</div>
                <div className="proposal-result-card__ba-content">{generatedProposal.beforeAfter.before}</div>
              </div>
              <div className="proposal-result-card__after">
                <div className="proposal-result-card__ba-label">After（導入後）</div>
                <div className="proposal-result-card__ba-content">{generatedProposal.beforeAfter.after}</div>
              </div>
            </div>
          </div>
        )}

        {/* 8. リスクの正直な開示 */}
        <div className="proposal-result-card__section">
          <div className="proposal-result-card__section-title">
            8. リスクの正直な開示
          </div>
          <div className="proposal-result-card__risks">
            {generatedProposal.risks.map((risk, i) => (
              <div key={i} className="proposal-result-card__risk-item">
                <span className="proposal-result-card__risk-icon">⚠</span>
                <span>{risk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 9. 止めない代償 */}
        {generatedProposal.tradeoffs && generatedProposal.tradeoffs.length > 0 && (
          <div className="proposal-result-card__section">
            <div className="proposal-result-card__section-title">9. 許容可能な代償</div>
            <div className="proposal-result-card__tradeoffs">
              {generatedProposal.tradeoffs.map((tradeoff, i) => (
                <div key={i} className="proposal-result-card__tradeoff-item">
                  <span className="proposal-result-card__tradeoff-icon">↔</span>
                  <span>{tradeoff}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 10. 必要データ要求 */}
        {generatedProposal.dataRequirements && generatedProposal.dataRequirements.length > 0 && (
          <div className="proposal-result-card__section">
            <div className="proposal-result-card__section-title">10. 次ステップで必要なデータ</div>
            <div className="proposal-result-card__data-requirements">
              {generatedProposal.dataRequirements.map((req, i) => (
                <div key={i} className="proposal-result-card__data-item">
                  <span className="proposal-result-card__data-icon">📊</span>
                  <span>{req}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 11. ご判断いただきたい点 */}
        <div className="proposal-result-card__section">
          <div className="proposal-result-card__section-title">
            11. ご判断いただきたい点
          </div>
          <div className="proposal-result-card__section-content">
            {generatedProposal.customerDecisionPoint}
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="proposal-result-card__actions">
        <button
          className="proposal-result-card__action-btn proposal-result-card__action-btn--copy"
          onClick={handleCopy}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {copied ? "コピーしました" : "クリップボードにコピー"}
        </button>

        <button
          className="proposal-result-card__action-btn proposal-result-card__action-btn--pptx"
          onClick={handleDownloadPptx}
          disabled={isExporting}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {isExporting ? "生成中..." : "PPTXでダウンロード"}
        </button>

        <button
          className="proposal-result-card__action-btn proposal-result-card__action-btn--regenerate"
          onClick={onRegenerate}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          再作成
        </button>
      </div>
    </div>
  );
}

// スライドタイトルを追加するヘルパー
function addSlideTitle(slide: ReturnType<InstanceType<typeof import("pptxgenjs").default>["addSlide"]>, title: string) {
  slide.addText(title, {
    x: 0.5,
    y: 0.3,
    w: "90%",
    h: 0.6,
    fontSize: 20,
    bold: true,
    color: "1f2937",
  });
  slide.addShape("line", {
    x: 0.5,
    y: 0.9,
    w: "90%",
    h: 0,
    line: { color: "e5e7eb", pt: 1 },
  });
}

/**
 * 判断論点を見やすくフォーマット
 * 【1. xxx】の形式を改行で区切って表示
 */
function formatEvaluationPoints(text: string): React.ReactNode {
  // 【数字. タイトル】のパターンで分割
  const parts = text.split(/(?=【\d+\.)/);

  if (parts.length <= 1) {
    // パターンがない場合はそのまま返す
    return text;
  }

  return (
    <>
      {parts.map((part, index) => {
        if (!part.trim()) return null;

        // タイトル部分と説明部分を分離
        const match = part.match(/^(【\d+\.[^】]+】)(.*)$/s);
        if (match) {
          const [, title, description] = match;
          return (
            <div key={index} className="proposal-result-card__eval-point">
              <div className="proposal-result-card__eval-point-title">{title}</div>
              <div className="proposal-result-card__eval-point-desc">{description.trim()}</div>
            </div>
          );
        }
        return <div key={index}>{part}</div>;
      })}
    </>
  );
}

/**
 * 提案書をプレーンテキストに変換
 */
function formatProposalAsText(proposal: ProposalResultData["generatedProposal"], customerName: string): string {
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

  let text = `# ${customerName} 様 ご提案書

`;

  if (proposal.positioning) {
    text += `${proposal.positioning}

`;
  }

  text += `## 1. 背景
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
`;

  if (proposal.whyNotOptionA) {
    text += `
## 6. A案を今回採用しない理由
${proposal.whyNotOptionA}
`;
  }

  if (proposal.beforeAfter) {
    text += `
## 7. 導入効果（Before/After）

**Before（現状）:**
${proposal.beforeAfter.before}

**After（導入後）:**
${proposal.beforeAfter.after}
`;
  }

  text += `
## 8. リスクの正直な開示
${proposal.risks.map((r) => `- ${r}`).join("\n")}
`;

  if (proposal.tradeoffs && proposal.tradeoffs.length > 0) {
    text += `
## 9. 許容可能な代償
${proposal.tradeoffs.map((t) => `- ${t}`).join("\n")}
`;
  }

  if (proposal.dataRequirements && proposal.dataRequirements.length > 0) {
    text += `
## 10. 次ステップで必要なデータ
${proposal.dataRequirements.map((d) => `- ${d}`).join("\n")}
`;
  }

  text += `
## 11. ご判断いただきたい点
${proposal.customerDecisionPoint}
`;

  return text;
}
