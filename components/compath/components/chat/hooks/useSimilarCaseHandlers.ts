/**
 * 類似事例検索関連のハンドラー
 * ChatPage.tsxから分離
 */

import { useState, useCallback } from "react";
import type { SimilarCaseSearchCondition, SimilarCase, SimilarCaseSearchResult } from "../../../types/similarCase";
import type { ProposalInputData, AttachedData } from "../../../types/chat";
import { generateDemoSearchResult } from "../../../data/similarCaseDemoData";
import { useDemoScenario } from "../../../data/DemoScenarioContext";

type UseSimilarCaseHandlersProps = {
  onAddMessage: (
    content: string,
    role: "user" | "assistant",
    attachedData?: AttachedData
  ) => void;
  setProcessingStatusText: (value: string | undefined) => void;
};

export function useSimilarCaseHandlers({
  onAddMessage,
  setProcessingStatusText,
}: UseSimilarCaseHandlersProps) {
  const { scenario } = useDemoScenario();
  // 類似事例検索の状態
  const [similarCaseLoading, setSimilarCaseLoading] = useState(false);

  // 類似事例検索実行ハンドラー
  const handleSearchSimilarCase = useCallback(
    async (condition: SimilarCaseSearchCondition) => {
      // ユーザーの検索条件をサマリーとして表示
      const scopeLabels: Record<string, string> = {
        same_customer: "同じ顧客（他拠点）",
        same_industry: "同業種",
        same_equipment: "同設備",
        all: "すべて",
      };
      const industryLabels: Record<string, string> = {
        manufacturing: "製造業",
        power: "電力",
        chemical: "化学",
        pharmaceutical: "製薬",
        food: "食品",
        other: "その他",
      };
      const equipmentLabels: Record<string, string> = {
        ip_strategy: "知財戦略",
        patent: "特許出願",
        licensing: "ライセンス",
        standardization: "標準化",
        rd_management: "研究開発管理",
        other: "その他",
      };

      onAddMessage(
        `業種: ${industryLabels[condition.industry] || condition.industry}、設備: ${equipmentLabels[condition.equipmentType] || condition.equipmentType}、範囲: ${scopeLabels[condition.searchScope] || condition.searchScope}`,
        "user"
      );

      setSimilarCaseLoading(true);
      setProcessingStatusText("類似事例を検索中...");

      try {
        // デモ用: ダミーデータから検索結果を生成
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 検索中の演出
        const result: SimilarCaseSearchResult = generateDemoSearchResult(condition, scenario.similarCases);

        onAddMessage(
          `${result.totalCount}件の類似事例が見つかりました。`,
          "assistant",
          { type: "similar_case_result", data: result }
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "類似事例の検索に失敗しました。";
        onAddMessage(`エラー: ${errorMessage}`, "assistant");
      } finally {
        setSimilarCaseLoading(false);
        setProcessingStatusText(undefined);
      }
    },
    [onAddMessage, setProcessingStatusText, scenario]
  );

  // 類似事例を参考に提案書を作成するハンドラー
  const handleUseSimilarCaseForProposal = useCallback(
    (caseData: SimilarCase) => {
      // 事例情報をサマリーとして表示
      onAddMessage(
        `「${caseData.title}」を参考に提案書を作成します。`,
        "user"
      );

      // 提案書作成フローを開始（Step1入力カードを表示）
      // 事例から業種やKPIをプリセット
      const inputData: ProposalInputData = {
        step: 1,
        customerContext: {
          industry: caseData.industry,
          kpiPriority: caseData.kpiPriority,
        },
      };

      onAddMessage(
        `参考事例の情報を反映しました。顧客背景を入力してください。\n\n**参考事例の教訓:**\n${caseData.lessons.map((l) => `- ${l}`).join("\n")}`,
        "assistant",
        { type: "proposal_input", data: inputData }
      );
    },
    [onAddMessage]
  );

  // Step0で「類似事例を参照」を選択したハンドラー
  const handleSelectSimilarCase = useCallback(() => {
    onAddMessage("類似事例を参照します。", "user");
    onAddMessage(
      "検索条件を入力してください。",
      "assistant",
      { type: "similar_case_input", data: {} }
    );
  }, [onAddMessage]);

  return {
    similarCaseLoading,
    handleSearchSimilarCase,
    handleUseSimilarCaseForProposal,
    handleSelectSimilarCase,
  };
}
