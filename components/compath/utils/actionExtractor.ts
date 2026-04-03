import type { ConcreteActionType, AgentAction } from "../types/agentMessage";

/**
 * AI提案文から具体的な行動候補を抽出
 * パターンマッチングで主要な行動タイプを検出し、該当しない場合は自由入力を提供
 */
export function extractConcreteActions(
  messageText: string,
  relatedNodes?: string[]
): AgentAction[] {
  const actions: AgentAction[] = [];
  let idCounter = 0;

  // パターン1: 予定登録（期限表現を検出）
  const schedulePatterns = [
    /(\d+)ヶ月(後|以内)/,
    /(\d+)日(後|以内)/,
    /(\d+)週間(後|以内)/,
    /(期限|スケジュール|予定)/
  ];

  const hasScheduleKeyword = schedulePatterns.some((pattern) => pattern.test(messageText));
  if (hasScheduleKeyword) {
    actions.push({
      id: `concrete-schedule-${idCounter++}`,
      label: "📅 予定を登録する",
      type: "concrete_action",
      concreteType: "schedule",
      formHint: "実施期限（例：2024年4月15日）、担当者、内容を入力してください",
      data: { messageText, relatedNodes }
    });
  }

  // パターン2: 計画作成
  const planPatterns = [/(計画|プラン|ロードマップ|アクション|立案|策定)/, /(段階的|優先順位)/];

  const hasPlanKeyword = planPatterns.some((pattern) => pattern.test(messageText));
  if (hasPlanKeyword) {
    actions.push({
      id: `concrete-plan-${idCounter++}`,
      label: "📋 アクションプランを作成する",
      type: "concrete_action",
      concreteType: "plan",
      formHint: "実施手順・優先順位・担当者を含む計画を入力してください",
      data: { messageText, relatedNodes }
    });
  }

  // パターン3: 詳細追記
  const detailPatterns = [/(追記|明記|記載|具体|詳細|記録)/, /(5W1H|誰が|いつ|どこで)/];

  const hasDetailKeyword = detailPatterns.some((pattern) => pattern.test(messageText));
  if (hasDetailKeyword) {
    actions.push({
      id: `concrete-detail-${idCounter++}`,
      label: "✍️ 詳細を追記する",
      type: "concrete_action",
      concreteType: "add_detail",
      formHint: "具体的な内容（担当者・期限・方法など）を入力してください",
      data: { messageText, relatedNodes }
    });
  }

  // パターン4: 効果検証
  const verifyPatterns = [/(検証|効果|測定|確認|PDCA)/, /(測定指標|基準値|測定期限)/];

  const hasVerifyKeyword = verifyPatterns.some((pattern) => pattern.test(messageText));
  if (hasVerifyKeyword) {
    actions.push({
      id: `concrete-verify-${idCounter++}`,
      label: "🔍 効果検証を計画する",
      type: "concrete_action",
      concreteType: "verify",
      formHint: "測定指標・目標値・測定日を入力してください（例：温度-10℃、対策後1ヶ月）",
      data: { messageText, relatedNodes }
    });
  }

  // パターン5: 横展開
  const deployPatterns = [/(横展開|展開|類似|他の|波及)/, /(範囲|対象|適用)/];

  const hasDeployKeyword = deployPatterns.some((pattern) => pattern.test(messageText));
  if (hasDeployKeyword) {
    actions.push({
      id: `concrete-deploy-${idCounter++}`,
      label: "🔄 横展開を計画する",
      type: "concrete_action",
      concreteType: "deploy",
      formHint: "展開対象・範囲・担当者を入力してください（例：同型機3台、A棟・B棟）",
      data: { messageText, relatedNodes }
    });
  }

  // パターン外または追加オプションとして自由入力を提供
  // ただし、既に2つ以上のアクションが抽出されている場合は不要
  if (actions.length === 0) {
    // 全くマッチしなかった場合は自由入力のみ
    actions.push({
      id: `concrete-freeform-${idCounter++}`,
      label: "💬 対応内容を記録する",
      type: "concrete_action",
      concreteType: "free_form",
      formHint: "この提案に対してどのように対応するか、自由に記入してください",
      data: { messageText, relatedNodes }
    });
  } else if (actions.length <= 2) {
    // 1-2個のマッチがあった場合は追加オプションとして自由入力も提供
    actions.push({
      id: `concrete-freeform-${idCounter++}`,
      label: "💬 その他の対応を記録",
      type: "concrete_action",
      concreteType: "free_form",
      formHint: "上記以外の対応内容を自由に記入してください",
      data: { messageText, relatedNodes }
    });
  }

  return actions;
}

/**
 * 行動タイプに応じた入力フォームのフィールド定義
 */
export type ActionFormField = {
  name: string;
  label: string;
  type: "text" | "date" | "textarea" | "select";
  placeholder?: string;
  required?: boolean;
  options?: string[];
};

/**
 * 行動タイプごとの入力フォーム構造を返す
 */
export function getFormFields(actionType: ConcreteActionType): ActionFormField[] {
  switch (actionType) {
    case "schedule":
      return [
        {
          name: "deadline",
          label: "実施期限",
          type: "date",
          required: true,
          placeholder: "2024-04-15"
        },
        {
          name: "assignee",
          label: "担当者",
          type: "text",
          required: true,
          placeholder: "山田太郎"
        },
        {
          name: "description",
          label: "内容",
          type: "textarea",
          required: true,
          placeholder: "具体的な実施内容を入力"
        }
      ];

    case "plan":
      return [
        {
          name: "steps",
          label: "実施手順",
          type: "textarea",
          required: true,
          placeholder: "1. 〇〇を実施\n2. △△を確認\n3. □□を完了"
        },
        {
          name: "priority",
          label: "優先順位",
          type: "select",
          required: true,
          options: ["高", "中", "低"]
        },
        {
          name: "assignee",
          label: "担当者",
          type: "text",
          required: true,
          placeholder: "山田太郎"
        }
      ];

    case "add_detail":
      return [
        {
          name: "who",
          label: "誰が",
          type: "text",
          placeholder: "担当者・部署"
        },
        {
          name: "when",
          label: "いつ",
          type: "text",
          placeholder: "期限・時期"
        },
        {
          name: "how",
          label: "どのように",
          type: "textarea",
          placeholder: "具体的な方法・手順"
        }
      ];

    case "verify":
      return [
        {
          name: "metric",
          label: "測定指標",
          type: "text",
          required: true,
          placeholder: "温度、不良率、リードタイムなど"
        },
        {
          name: "target",
          label: "目標値",
          type: "text",
          required: true,
          placeholder: "-10℃、不良率0.5%以下など"
        },
        {
          name: "measureDate",
          label: "測定日",
          type: "date",
          required: true,
          placeholder: "対策実施後1ヶ月"
        }
      ];

    case "deploy":
      return [
        {
          name: "targets",
          label: "展開対象",
          type: "textarea",
          required: true,
          placeholder: "同型機3台（A棟、B棟、C棟）\n類似プロセス2ライン"
        },
        {
          name: "assignee",
          label: "担当者",
          type: "text",
          required: true,
          placeholder: "横展開責任者"
        },
        {
          name: "deadline",
          label: "展開期限",
          type: "date",
          required: true
        }
      ];

    case "free_form":
    default:
      return [
        {
          name: "content",
          label: "対応内容",
          type: "textarea",
          required: true,
          placeholder: "この提案に対してどのように対応するか記入してください"
        }
      ];
  }
}
