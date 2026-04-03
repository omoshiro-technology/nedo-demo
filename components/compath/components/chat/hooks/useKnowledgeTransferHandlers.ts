/**
 * 技術伝承デモ関連のハンドラー
 * ChatPage.tsxから分離
 */

import { useState, useCallback, useRef } from "react";
import type {
  KnowledgeTransferConditions,
  KnowledgeTransferStep,
  AttachedData,
  DecisionCaseSearchResult,
} from "../../../types/chat";
import { searchDecisionCases } from "../../../api/decisionCase";

type UseKnowledgeTransferHandlersProps = {
  onAddMessage: (
    content: string,
    role: "user" | "assistant",
    attachedData?: AttachedData
  ) => void;
  setDnSidePanel: (value: {
    isOpen: boolean;
    initialData?: { purpose: string; currentSituation: string };
    skipPreconditionModal?: boolean;
    skipPastCasePanel?: boolean;
  } | null) => void;
  setChatInputPrefill: (value: string | undefined) => void;
};

// 条件のサマリーを生成
function buildConditionSummary(conditions: KnowledgeTransferConditions): string {
  const parts: string[] = [];

  if (conditions.startupFrequency) {
    const freqLabel = {
      high: "技術独自性: 高い（競合にない独自技術）",
      medium: "技術独自性: 中程度（一部に独自要素あり）",
      low: "技術独自性: 低い（類似技術が存在）",
    }[conditions.startupFrequency];
    parts.push(freqLabel);
  }

  if (conditions.recoveryTimeTarget) {
    const recoveryLabel = {
      strict: "事業化時期: 1年以内（早期事業化）",
      moderate: "事業化時期: 2〜3年（標準的）",
      flexible: "事業化時期: 3年以上（長期研究）",
    }[conditions.recoveryTimeTarget];
    parts.push(recoveryLabel);
  }

  if (conditions.spaceConstraint) {
    const spaceLabel = {
      tight: "海外展開: 主要国優先（米欧中を優先）",
      standard: "海外展開: 段階的（市場に応じて追加）",
      ample: "海外展開: 国内中心（当面は国内のみ）",
    }[conditions.spaceConstraint];
    parts.push(spaceLabel);
  }

  return parts.map(p => `・${p}`).join("\n");
}

// 条件から検索クエリを構築
function buildSearchQuery(conditions: KnowledgeTransferConditions): string {
  const parts = ["知財戦略", "出願方針"];

  if (conditions.startupFrequency === "high") {
    parts.push("技術独自性 高い 単独出願");
  } else if (conditions.startupFrequency === "low") {
    parts.push("技術独自性 低い 共同出願");
  }

  if (conditions.recoveryTimeTarget === "strict") {
    parts.push("事業接続 早期 製品化優先");
  }

  if (conditions.spaceConstraint === "tight") {
    parts.push("共創機会 あり オープンイノベーション");
  }

  return parts.join(" ");
}

export function useKnowledgeTransferHandlers({
  onAddMessage,
  setDnSidePanel,
  setChatInputPrefill,
}: UseKnowledgeTransferHandlersProps) {
  // 技術伝承デモ: 条件収集フローの状態管理
  const [ktStep, setKtStep] = useState<KnowledgeTransferStep>("idle");
  const [ktConditions, setKtConditions] = useState<KnowledgeTransferConditions>({});
  // 技術伝承デモ: 目的（promptから抽出）
  const [ktPurpose, setKtPurpose] = useState<string>("");

  // 選択中の判断事例（質問回答後の傾向表示・条件設定に使用）
  const selectedDecisionCaseRef = useRef<DecisionCaseSearchResult | null>(null);

  // 判断事例選択ハンドラー（この例を使って決める）
  const handleSelectDecisionCase = useCallback(
    (caseItem: DecisionCaseSearchResult) => {
      selectedDecisionCaseRef.current = caseItem;

      // ユーザーメッセージを追加
      onAddMessage(`「${caseItem.title}」を参考に意思決定ナビで整理します`, "user");

      // 意思決定ナビを起動（過去事例の情報を引き継ぐ）
      setTimeout(() => {
        setDnSidePanel({
          isOpen: true,
          initialData: {
            purpose: ktPurpose || "特許出願方針に影響する条件の整理",
            currentSituation: `参照事例: ${caseItem.title}\n過去の判断: ${caseItem.decision.summary}\n理由: ${caseItem.rationale.primary}`,
          },
          skipPreconditionModal: true,
        });
      }, 100);
    },
    [onAddMessage, ktPurpose, setDnSidePanel]
  );

  // 傾向カードから意思決定ナビを起動するハンドラー
  const handleLaunchDecisionNavigatorFromTrend = useCallback(() => {
    // 既存のPreconditionModalを使用して意思決定ナビを起動
    setDnSidePanel({
      isOpen: true,
      initialData: {
        purpose: ktPurpose || "特許出願方針に影響する条件の整理",
        currentSituation: "過去の熟達者の判断傾向を参考に、現在の条件で最適な樹脂量を決定する",
      },
      skipPreconditionModal: false, // 既存モーダルを表示
    });
  }, [ktPurpose, setDnSidePanel]);

  // 傾向から再検討ハンドラー
  const handleRetryTrend = useCallback(() => {
    // 検索画面に戻る（新しい検索を促す）
    setChatInputPrefill("別の条件で判断事例を検索します: ");
  }, [setChatInputPrefill]);

  // 過去事例をスキップして自分で判断するハンドラー
  // Phase 10: 意思決定ナビは起動せず、自然な会話を継続
  const handleSkipDecisionCases = useCallback(() => {
    onAddMessage("過去事例は参照せずに進めます", "user");
    onAddMessage("承知しました。お気軽にご相談ください。", "assistant");
  }, [onAddMessage]);

  // 技術伝承デモ: 条件収集カードの回答処理
  const handleSubmitKTConditions = useCallback(
    async (conditions: KnowledgeTransferConditions) => {
      // 条件のサマリーを作成
      const conditionSummary = buildConditionSummary(conditions);

      // ユーザーの回答をメッセージとして表示
      onAddMessage(`条件を入力しました:\n${conditionSummary}`, "user");

      // 検索中メッセージ
      onAddMessage("この条件で過去の類似事例を検索しています...", "assistant");

      setKtStep("searching");
      setKtConditions(conditions);

      // 条件に基づいて検索を実行
      try {
        const searchQuery = buildSearchQuery(conditions);
        const searchResult = await searchDecisionCases(searchQuery, {
          topK: 3,
          minSimilarity: 0.3,
        });

        setKtStep("showing_results");

        if (searchResult.results.length > 0 && searchResult.results[0].similarity > 0.5) {
          // 類似度が高い事例あり → 過去事例を提示
          const bestMatch = searchResult.results[0];
          const attachedData: AttachedData = {
            type: "decision_case_search",
            data: {
              query: searchQuery,
              results: searchResult.results,
              total: searchResult.total,
            },
          };

          onAddMessage(
            `同様の条件で過去${searchResult.total}件の判断事例が見つかりました。\n\n` +
            `最も類似度の高い事例は「${bestMatch.title}」（類似度: ${Math.round(bestMatch.similarity * 100)}%）です。\n\n` +
            `**過去の判断**: ${bestMatch.decision.summary}\n` +
            `**理由**: ${bestMatch.rationale.primary}\n\n` +
            `この事例を参考に進めますか？または意思決定ナビで条件を詳しく整理しますか？`,
            "assistant",
            attachedData
          );
        } else {
          // 類似事例なし → 意思決定ナビを提案
          onAddMessage(
            "お聞きした条件に近い過去事例は見つかりませんでした。\n\n" +
            "この条件は過去に例のない特殊なケースかもしれません。意思決定ナビで条件を整理しながら判断を進めましょう。",
            "assistant"
          );

          // 意思決定ナビを起動
          setTimeout(() => {
            setDnSidePanel({
              isOpen: true,
              initialData: {
                purpose: ktPurpose || "特許出願方針に影響する条件の整理",
                currentSituation: `条件: ${conditionSummary}`,
              },
              skipPreconditionModal: true,
            });
          }, 100);
        }
      } catch (error) {
        console.error("判断事例検索エラー:", error);
        setKtStep("idle");
        onAddMessage(
          "判断事例の検索に失敗しました。意思決定ナビで整理を進めましょう。",
          "assistant"
        );
        setTimeout(() => {
          setDnSidePanel({
            isOpen: true,
            initialData: {
              purpose: ktPurpose || "特許出願方針に影響する条件の整理",
              currentSituation: "条件収集完了後、検索エラーにより意思決定ナビで整理",
            },
            skipPreconditionModal: true,
          });
        }, 100);
      }
    },
    [onAddMessage, ktPurpose, setDnSidePanel]
  );

  // 技術伝承デモ: 条件収集フローの回答を処理（テキスト入力用 - 現在は未使用）
  const handleKnowledgeTransferAnswer = useCallback(
    async (message: string) => {
      const msgLower = message.toLowerCase();

      // 起動頻度の回答を解析
      if (ktStep === "asking_frequency") {
        let frequency: KnowledgeTransferConditions["startupFrequency"];
        if (msgLower.includes("10回未満") || msgLower.includes("定検") || msgLower.includes("2-3回") || msgLower.includes("少な")) {
          frequency = "low";
        } else if (msgLower.includes("30回以上") || msgLower.includes("頻繁") || msgLower.includes("多い")) {
          frequency = "high";
        } else {
          frequency = "medium"; // デフォルトは中程度
        }

        const newConditions = { ...ktConditions, startupFrequency: frequency };
        setKtConditions(newConditions);
        setKtStep("asking_recovery_time");

        // 次の質問: 復旧時間目標
        onAddMessage(
          "**2. 復旧時間の目標について**\n" +
          "樹脂再生時の復旧目標時間はどの程度ですか？\n\n" +
          "・**4時間以内**（迅速な復旧が必要、運転継続が望ましい）\n" +
          "・**8時間以内**（標準的な目標）\n" +
          "・**制約なし**（時間に余裕がある）\n\n" +
          "_※ この質問の意図: 復旧時間が厳しい場合、再生中も運転継続できるホールドアップ式が有利です_",
          "assistant"
        );
        return true; // 処理済み
      }

      // 復旧時間の回答を解析
      if (ktStep === "asking_recovery_time") {
        let recoveryTime: KnowledgeTransferConditions["recoveryTimeTarget"];
        if (msgLower.includes("4時間") || msgLower.includes("迅速") || msgLower.includes("厳し")) {
          recoveryTime = "strict";
        } else if (msgLower.includes("制約なし") || msgLower.includes("余裕") || msgLower.includes("緩")) {
          recoveryTime = "flexible";
        } else {
          recoveryTime = "moderate"; // デフォルトは中程度
        }

        const newConditions = { ...ktConditions, recoveryTimeTarget: recoveryTime };
        setKtConditions(newConditions);
        setKtStep("asking_space");

        // 次の質問: スペース制約
        onAddMessage(
          "**3. 設置スペースについて**\n" +
          "設置場所のスペース制約はどの程度ですか？\n\n" +
          "・**厳しい**（既存建屋内への設置など）\n" +
          "・**標準**（一般的な制約）\n" +
          "・**余裕あり**（十分なスペースが確保できる）\n\n" +
          "_※ この質問の意図: スペースが厳しい場合、コンパクトなベッセル切替式が有利な場合があります_",
          "assistant"
        );
        return true; // 処理済み
      }

      // スペース制約の回答を解析 → 検索実行
      if (ktStep === "asking_space") {
        let spaceConstraint: KnowledgeTransferConditions["spaceConstraint"];
        if (msgLower.includes("厳しい") || msgLower.includes("狭い") || msgLower.includes("既存")) {
          spaceConstraint = "tight";
        } else if (msgLower.includes("余裕") || msgLower.includes("十分") || msgLower.includes("広い")) {
          spaceConstraint = "ample";
        } else {
          spaceConstraint = "standard"; // デフォルトは標準
        }

        const finalConditions = { ...ktConditions, spaceConstraint: spaceConstraint };
        setKtConditions(finalConditions);
        setKtStep("searching");

        // 条件確認メッセージ
        const conditionSummary = buildConditionSummary(finalConditions);
        onAddMessage(
          `条件を確認しました。\n\n${conditionSummary}\n\nこの条件で過去の類似事例を検索しています...`,
          "assistant"
        );

        // 条件に基づいて検索を実行
        try {
          const searchQuery = buildSearchQuery(finalConditions);
          const searchResult = await searchDecisionCases(searchQuery, {
            topK: 3,
            minSimilarity: 0.3, // 条件に基づくので閾値を少し上げる
          });

          setKtStep("showing_results");

          if (searchResult.results.length > 0 && searchResult.results[0].similarity > 0.5) {
            // 類似度が高い事例あり → 過去事例を提示
            const bestMatch = searchResult.results[0];
            const attachedData: AttachedData = {
              type: "decision_case_search",
              data: {
                query: searchQuery,
                results: searchResult.results,
                total: searchResult.total,
              },
            };

            onAddMessage(
              `同様の条件で過去${searchResult.total}件の判断事例が見つかりました。\n\n` +
              `最も類似度の高い事例は「${bestMatch.title}」（類似度: ${Math.round(bestMatch.similarity * 100)}%）です。\n\n` +
              `**過去の判断**: ${bestMatch.decision.summary}\n` +
              `**理由**: ${bestMatch.rationale.primary}\n\n` +
              `この事例を参考に進めますか？または意思決定ナビで条件を詳しく整理しますか？`,
              "assistant",
              attachedData
            );
          } else {
            // 類似事例なし → 意思決定ナビを提案
            onAddMessage(
              "お聞きした条件に近い過去事例は見つかりませんでした。\n\n" +
              "この条件は過去に例のない特殊なケースかもしれません。意思決定ナビで条件を整理しながら判断を進めましょう。",
              "assistant"
            );

            // 意思決定ナビを起動
            setTimeout(() => {
              setDnSidePanel({
                isOpen: true,
                initialData: {
                  purpose: ktPurpose || "特許出願方針に影響する条件の整理",
                  currentSituation: `条件: ${conditionSummary}`,
                },
                skipPreconditionModal: true, // 条件は既に収集済みなのでスキップ
              });
            }, 100);
          }
        } catch (error) {
          console.error("判断事例検索エラー:", error);
          setKtStep("idle");
          onAddMessage(
            "判断事例の検索に失敗しました。意思決定ナビで整理を進めましょう。",
            "assistant"
          );
          setTimeout(() => {
            setDnSidePanel({
              isOpen: true,
              initialData: {
                purpose: ktPurpose || "特許出願方針に影響する条件の整理",
                currentSituation: "条件収集完了後、検索エラーにより意思決定ナビで整理",
              },
              skipPreconditionModal: true,
            });
          }, 100);
        }
        return true; // 処理済み
      }

      return false; // 条件収集フロー外のメッセージ
    },
    [ktStep, ktConditions, ktPurpose, onAddMessage, setDnSidePanel]
  );

  return {
    ktStep,
    setKtStep,
    ktConditions,
    setKtConditions,
    ktPurpose,
    setKtPurpose,
    handleSelectDecisionCase,
    handleLaunchDecisionNavigatorFromTrend,
    handleRetryTrend,
    handleSkipDecisionCases,
    handleSubmitKTConditions,
    handleKnowledgeTransferAnswer,
  };
}
