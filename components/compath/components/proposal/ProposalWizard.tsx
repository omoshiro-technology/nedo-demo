"use client"
/**
 * 提案書作成ウィザード
 * Phase 28: 営業向け提案書作成支援
 */

import { useState, useCallback } from "react";
import type {
  CustomerContext,
  EvaluationPoints,
  GeneratedProposal,
  ProposalWizardStep,
} from "../../types/proposal";
import { CustomerContextCard } from "./CustomerContextCard";
import { EvaluationPointsCard } from "./EvaluationPointsCard";
import { ProposalPreview } from "./ProposalPreview";
import { generateProposal } from "../../api/proposal";

type Props = {
  onClose: () => void;
};

const STEP_LABELS: Record<ProposalWizardStep, string> = {
  1: "顧客背景",
  2: "判断論点",
  3: "提案書",
};

export function ProposalWizard({ onClose }: Props) {
  const [currentStep, setCurrentStep] = useState<ProposalWizardStep>(1);
  const [customerContext, setCustomerContext] = useState<Partial<CustomerContext>>({
    currentIssues: [],
  });
  const [evaluationPoints, setEvaluationPoints] = useState<Partial<EvaluationPoints>>({});
  const [generatedProposal, setGeneratedProposal] = useState<GeneratedProposal | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const isStep1Valid = useCallback(() => {
    return (
      customerContext.name &&
      customerContext.name.trim() !== "" &&
      customerContext.industry &&
      customerContext.kpiPriority
    );
  }, [customerContext]);

  const isStep2Valid = useCallback(() => {
    return (
      evaluationPoints.bufferCapacity &&
      evaluationPoints.switchingImpact &&
      evaluationPoints.contingencyOptions
    );
  }, [evaluationPoints]);

  const handleNext = async () => {
    if (currentStep === 1 && isStep1Valid()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && isStep2Valid()) {
      setCurrentStep(3);
      await handleGenerate();
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
      setGeneratedProposal(null);
      setError(undefined);
    }
  };

  const handleGenerate = async () => {
    if (!isStep1Valid() || !isStep2Valid()) return;

    setIsGenerating(true);
    setError(undefined);

    try {
      const response = await generateProposal({
        customerContext: customerContext as CustomerContext,
        evaluationPoints: evaluationPoints as EvaluationPoints,
      });
      setGeneratedProposal(response.generatedProposal);
    } catch (err) {
      console.error("Failed to generate proposal:", err);
      setError(
        err instanceof Error ? err.message : "提案書の生成に失敗しました"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <CustomerContextCard
            value={customerContext}
            onChange={setCustomerContext}
          />
        );
      case 2:
        return (
          <EvaluationPointsCard
            value={evaluationPoints}
            onChange={setEvaluationPoints}
          />
        );
      case 3:
        return (
          <ProposalPreview
            proposal={generatedProposal}
            isGenerating={isGenerating}
            error={error}
            onRegenerate={handleGenerate}
          />
        );
      default:
        return null;
    }
  };

  const canGoNext = currentStep === 1 ? isStep1Valid() : isStep2Valid();

  return (
    <div className="proposal-wizard">
      {/* ヘッダー */}
      <div className="proposal-wizard__header">
        <h2 className="proposal-wizard__title">提案書作成</h2>
        <button className="proposal-wizard__close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* ステッパー */}
      <div className="proposal-wizard__stepper">
        {([1, 2, 3] as ProposalWizardStep[]).map((step, index) => (
          <div key={step} className="proposal-wizard__step-wrapper">
            {index > 0 && (
              <div
                className={`proposal-wizard__step-connector ${
                  currentStep > step - 1
                    ? "proposal-wizard__step-connector--completed"
                    : ""
                }`}
              />
            )}
            <div
              className={`proposal-wizard__step ${
                currentStep === step
                  ? "proposal-wizard__step--active"
                  : currentStep > step
                  ? "proposal-wizard__step--completed"
                  : ""
              }`}
            >
              <div className="proposal-wizard__step-number">
                {currentStep > step ? "✓" : step}
              </div>
              <span className="proposal-wizard__step-label">
                {STEP_LABELS[step]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="proposal-wizard__content">{renderStepContent()}</div>

      {/* フッター */}
      <div className="proposal-wizard__footer">
        {currentStep > 1 ? (
          <button
            className="proposal-wizard__nav-btn proposal-wizard__nav-btn--back"
            onClick={handleBack}
            disabled={isGenerating}
          >
            戻る
          </button>
        ) : (
          <div />
        )}

        {currentStep < 3 && (
          <button
            className={`proposal-wizard__nav-btn ${
              currentStep === 2
                ? "proposal-wizard__nav-btn--generate"
                : "proposal-wizard__nav-btn--next"
            }`}
            onClick={handleNext}
            disabled={!canGoNext}
          >
            {currentStep === 2 ? "提案書を生成" : "次へ"}
          </button>
        )}
      </div>
    </div>
  );
}
