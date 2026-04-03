/**
 * 提案書作成フロー関連のハンドラー
 * ChatPage.tsxから分離
 */

import { useState, useCallback } from "react";
import type { CustomerContext, EvaluationPoints } from "../../../types/proposal";
import { CURRENT_ISSUE_LABELS } from "../../../types/proposal";
import type { ProposalInputData, ProposalResultData, ProposalErrorData, AttachedData, ChatMessage } from "../../../types/chat";
import { generateProposal } from "../../../api/proposal";

type UseProposalHandlersProps = {
  onAddMessage: (
    content: string,
    role: "user" | "assistant",
    attachedData?: AttachedData
  ) => void;
  messages: ChatMessage[];
  setIsProcessing: (value: boolean) => void;
  setProcessingStatusText: (value: string | undefined) => void;
};

export function useProposalHandlers({
  onAddMessage,
  messages,
  setIsProcessing,
  setProcessingStatusText,
}: UseProposalHandlersProps) {
  // 提案書作成フローの状態
  const [proposalCustomerContext, setProposalCustomerContext] = useState<CustomerContext | null>(null);

  // Step1（顧客背景）送信ハンドラー
  const handleSubmitProposalStep1 = useCallback(
    (customerContext: CustomerContext) => {
      // 顧客背景を保存
      setProposalCustomerContext(customerContext);

      // ユーザーの入力内容をサマリーとして表示
      // CURRENT_ISSUE_LABELSを使用して正しいラベルを取得
      const issueLabels = customerContext.currentIssues?.map(
        (issue) => {
          const labelInfo = CURRENT_ISSUE_LABELS[issue];
          return labelInfo?.label || issue;
        }
      ) || [];

      onAddMessage(
        `顧客: ${customerContext.name}\n課題: ${issueLabels.join("、")}`,
        "user"
      );

      // Step2の入力カードを表示
      const inputData: ProposalInputData = {
        step: 2,
        customerContext,
      };
      onAddMessage(
        "ありがとうございます。次に、以下の判断論点について現状を確認させてください。",
        "assistant",
        { type: "proposal_input", data: inputData }
      );
    },
    [onAddMessage]
  );

  // Step2（判断論点）送信ハンドラー → 提案書生成
  const handleSubmitProposalStep2 = useCallback(
    async (evaluationPoints: EvaluationPoints) => {
      if (!proposalCustomerContext) {
        console.error("[useProposalHandlers] proposalCustomerContext is null!");
        onAddMessage("エラー: 顧客背景が設定されていません。", "assistant");
        return;
      }

      // ユーザーの入力内容をサマリーとして表示
      onAddMessage("判断論点を確認しました。提案書を生成します。", "user");

      setIsProcessing(true);
      setProcessingStatusText("提案書を生成中...");

      try {
        const response = await generateProposal({
          customerContext: proposalCustomerContext,
          evaluationPoints,
        });
        // 結果カードを表示
        const resultData: ProposalResultData = {
          customerContext: proposalCustomerContext,
          evaluationPoints,
          generatedProposal: response.generatedProposal,
          templateId: response.templateId,
          generatedAt: response.generatedAt,
        };

        onAddMessage(
          "提案書を生成しました。",
          "assistant",
          { type: "proposal_result", data: resultData }
        );
      } catch (error) {
        console.error("[useProposalHandlers] API error:", error);
        const errorMessage = error instanceof Error ? error.message : "提案書の生成に失敗しました。";

        // エラーカードを表示（再試行可能）
        const errorData: ProposalErrorData = {
          message: errorMessage,
          customerContext: proposalCustomerContext,
          evaluationPoints,
        };
        onAddMessage(
          errorMessage,
          "assistant",
          { type: "proposal_error", data: errorData }
        );
      } finally {
        setIsProcessing(false);
        setProcessingStatusText(undefined);
      }
    },
    [proposalCustomerContext, onAddMessage, setIsProcessing, setProcessingStatusText]
  );

  // 提案書再生成ハンドラー
  const handleRegenerateProposal = useCallback(() => {
    // 最後のproposal_resultまたはproposal_errorを探して、その条件で再生成
    const lastResultMessage = [...messages].reverse().find(
      (m) => m.attachedData?.type === "proposal_result" || m.attachedData?.type === "proposal_error"
    );

    if (lastResultMessage?.attachedData?.type === "proposal_result") {
      const { customerContext, evaluationPoints } = lastResultMessage.attachedData.data;
      setProposalCustomerContext(customerContext);
      handleSubmitProposalStep2(evaluationPoints);
    } else if (lastResultMessage?.attachedData?.type === "proposal_error") {
      const { customerContext, evaluationPoints } = lastResultMessage.attachedData.data;
      setProposalCustomerContext(customerContext);
      handleSubmitProposalStep2(evaluationPoints);
    }
  }, [messages, handleSubmitProposalStep2]);

  // Step0で「新規作成」を選択したハンドラー
  const handleSelectNewProposal = useCallback(() => {
    onAddMessage("新規作成で進めます。", "user");

    // Step1の入力カードを表示
    const inputData: ProposalInputData = {
      step: 1,
    };
    onAddMessage(
      "承知しました。顧客背景を教えてください。",
      "assistant",
      { type: "proposal_input", data: inputData }
    );
  }, [onAddMessage]);

  return {
    proposalCustomerContext,
    setProposalCustomerContext,
    handleSubmitProposalStep1,
    handleSubmitProposalStep2,
    handleRegenerateProposal,
    handleSelectNewProposal,
  };
}
