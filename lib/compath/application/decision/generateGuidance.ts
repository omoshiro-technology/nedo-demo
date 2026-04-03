import type {
  DecisionGuidance,
  DecisionPatternType,
  DecisionStatus,
  GuidanceActionItem,
  GuidanceActionType,
} from "../../domain/types";

/**
 * 曖昧性フラグに基づく具体的なアクション提案
 */
const FLAG_TO_ACTIONS: Record<string, string[]> = {
  条件付きの決定: ["条件の詳細を明確化する", "条件が満たされる時期を確認する"],
  条件分岐あり: ["各条件のケースを洗い出す", "どの条件が適用されるか確認する"],
  "「予定」を含む": ["正式な決定日を設定する", "予定から決定へ移行する基準を明確にする"],
  "「検討」を含む": ["検討の期限を設定する", "検討結果を報告する担当者を決める"],
  "「協議」を含む": ["協議の参加者を明確にする", "協議の結論を文書化する"],
  "「可能性」を含む": ["可能性を確率として評価する", "確定的な判断基準を設定する"],
  "「方向で」を含む（未確定）": ["正式な決定として文書化する", "方向性を具体的な行動計画に落とし込む"],
  疑問形: ["質問への回答を得る", "回答者と期限を明確にする"],
  "疑問の「か」を含む": ["疑問点を解消するための情報を収集する"],
  "「保留」を含む": ["保留解除の条件を明確にする", "保留期限を設定する"],
  "「見送り」を含む": ["見送りの理由を文書化する", "再検討のタイミングを設定する"],
};

/**
 * パターン種別に基づく一般的な確認質問
 */
const PATTERN_QUESTIONS: Record<DecisionPatternType, string[]> = {
  decision: [
    "この決定の最終承認者は誰ですか？",
    "いつまでにこの決定を実行しますか？",
    "関係者全員に周知されていますか？",
  ],
  agreement: [
    "合意した関係者は誰ですか？",
    "合意内容は文書化されていますか？",
    "合意の有効期限はありますか？",
  ],
  change: [
    "変更前の状態は文書化されていますか？",
    "変更による影響範囲を確認しましたか？",
    "変更のロールバック手順はありますか？",
  ],
  adoption: [
    "採用の決裁者は承認しましたか？",
    "導入スケジュールは確定していますか？",
    "必要なリソースは確保されていますか？",
  ],
  cancellation: [
    "中止の理由は関係者に共有されていますか？",
    "中止による影響は評価されていますか？",
    "代替案は検討されていますか？",
  ],
  other: [
    "この内容は正式な決定として扱いますか？",
    "責任者は明確ですか？",
  ],
};

/**
 * 曖昧性フラグ→構造化アクションのマッピング
 */
type ActionItemTemplate = {
  actionType: GuidanceActionType;
  target: string;
  actor?: string;
  dueDate?: string;
  missingFields: Array<"actor" | "target" | "dueDate">;
};

const FLAG_TO_ACTION_ITEMS: Record<string, ActionItemTemplate> = {
  条件付きの決定: {
    actionType: "clarify_condition",
    target: "条件の詳細を洗い出す",
    missingFields: ["actor", "dueDate"],
  },
  条件分岐あり: {
    actionType: "clarify_condition",
    target: "適用される条件ケースを特定する",
    missingFields: ["actor", "dueDate"],
  },
  "「予定」を含む": {
    actionType: "set_deadline",
    target: "正式な決定日を確定する",
    missingFields: ["actor", "dueDate"],
  },
  "「検討」を含む": {
    actionType: "set_deadline",
    target: "検討期限と報告者を決定する",
    missingFields: ["actor", "dueDate"],
  },
  "「協議」を含む": {
    actionType: "document_decision",
    target: "協議参加者リストと結論を文書化する",
    missingFields: ["actor", "dueDate"],
  },
  "「可能性」を含む": {
    actionType: "clarify_condition",
    target: "確率評価と判断基準を設定する",
    missingFields: ["actor", "dueDate"],
  },
  "「方向で」を含む（未確定）": {
    actionType: "document_decision",
    target: "方向性を正式な決定として文書化する",
    missingFields: ["actor", "dueDate"],
  },
  疑問形: {
    actionType: "assign_owner",
    target: "質問への回答を得る",
    missingFields: ["actor", "dueDate"],
  },
  "疑問の「か」を含む": {
    actionType: "clarify_condition",
    target: "疑問点を解消するための情報を収集する",
    missingFields: ["actor", "dueDate"],
  },
  "「保留」を含む": {
    actionType: "set_deadline",
    target: "保留解除の条件と期限を明確化する",
    missingFields: ["actor", "dueDate"],
  },
  "「見送り」を含む": {
    actionType: "set_deadline",
    target: "再検討のタイミングを設定する",
    missingFields: ["actor", "dueDate"],
  },
};

/**
 * パターン種別ごとのデフォルトアクター
 */
const PATTERN_DEFAULT_ACTORS: Record<DecisionPatternType, string> = {
  decision: "決定権限者",
  agreement: "合意関係者",
  change: "変更管理責任者",
  adoption: "採用決裁者",
  cancellation: "プロジェクトリーダー",
  other: "責任者",
};

/**
 * 曖昧性フラグから不足情報を特定
 */
function identifyMissingInfo(ambiguityFlags: string[]): string[] {
  const missingInfo: string[] = [];

  for (const flag of ambiguityFlags) {
    if (flag.includes("条件")) {
      missingInfo.push("条件の詳細が不明確");
    }
    if (flag.includes("予定") || flag.includes("検討") || flag.includes("協議")) {
      missingInfo.push("確定時期が不明");
    }
    if (flag.includes("可能性") || flag.includes("方向で")) {
      missingInfo.push("確実性が低い");
    }
    if (flag.includes("疑問")) {
      missingInfo.push("回答待ちの質問がある");
    }
    if (flag.includes("保留")) {
      missingInfo.push("保留解除の条件が不明");
    }
    if (flag.includes("見送り")) {
      missingInfo.push("再検討時期が不明");
    }
  }

  // 重複を除去
  return [...new Set(missingInfo)];
}

/**
 * 必要なアクションを生成
 */
function generateRequiredActions(ambiguityFlags: string[]): string[] {
  const actions: string[] = [];

  for (const flag of ambiguityFlags) {
    const flagActions = FLAG_TO_ACTIONS[flag];
    if (flagActions) {
      actions.push(...flagActions);
    }
  }

  // 重複を除去し、最大5件に制限
  return [...new Set(actions)].slice(0, 5);
}

/**
 * 確認すべき質問を生成
 */
function generateSuggestedQuestions(
  patternType: DecisionPatternType,
  ambiguityFlags: string[]
): string[] {
  const questions: string[] = [];

  // パターン固有の質問
  const patternQuestions = PATTERN_QUESTIONS[patternType] || PATTERN_QUESTIONS.other;
  questions.push(...patternQuestions);

  // 曖昧性に基づく追加質問
  if (ambiguityFlags.some((f) => f.includes("条件"))) {
    questions.push("すべての条件が満たされた場合、この決定は自動的に確定しますか？");
  }
  if (ambiguityFlags.some((f) => f.includes("予定") || f.includes("検討"))) {
    questions.push("いつまでに最終決定を行いますか？");
  }
  if (ambiguityFlags.some((f) => f.includes("疑問"))) {
    questions.push("この疑問に回答できる人は誰ですか？");
  }

  // 重複を除去し、最大5件に制限
  return [...new Set(questions)].slice(0, 5);
}

/**
 * 構造化されたアクション項目を生成
 */
function generateActionItems(
  patternType: DecisionPatternType,
  ambiguityFlags: string[]
): GuidanceActionItem[] {
  const items: GuidanceActionItem[] = [];
  const defaultActor = PATTERN_DEFAULT_ACTORS[patternType];
  const processedTargets = new Set<string>();

  for (const flag of ambiguityFlags) {
    const template = FLAG_TO_ACTION_ITEMS[flag];
    if (template && !processedTargets.has(template.target)) {
      processedTargets.add(template.target);

      const actor = template.actor || defaultActor;
      const item: GuidanceActionItem = {
        id: `action-${items.length + 1}`,
        actionType: template.actionType,
        actor,
        target: template.target,
        dueDate: template.dueDate,
        summary: `${actor}が${template.target}`,
        missingFields: template.missingFields,
        sourceFlags: [flag],
      };
      items.push(item);
    }
  }

  // 最大5件に制限
  return items.slice(0, 5);
}

/**
 * グレー判定された決定に対して判断支援情報を生成
 */
export function generateGuidance(
  patternType: DecisionPatternType,
  status: DecisionStatus,
  ambiguityFlags: string[]
): DecisionGuidance | undefined {
  // confirmed（確定）の場合はガイダンス不要
  if (status === "confirmed") {
    return undefined;
  }

  // gray または proposed の場合にガイダンスを生成
  const missingInfo = identifyMissingInfo(ambiguityFlags);
  const requiredActions = generateRequiredActions(ambiguityFlags);
  const suggestedQuestions = generateSuggestedQuestions(patternType, ambiguityFlags);
  const actionItems = generateActionItems(patternType, ambiguityFlags);

  // 何も生成されなかった場合はデフォルトのガイダンス
  if (
    missingInfo.length === 0 &&
    requiredActions.length === 0 &&
    suggestedQuestions.length === 0
  ) {
    const defaultActor = PATTERN_DEFAULT_ACTORS[patternType];
    return {
      missingInfo: ["確定に必要な情報が不足しています"],
      requiredActions: ["責任者に確認を取る"],
      suggestedQuestions: PATTERN_QUESTIONS[patternType] || PATTERN_QUESTIONS.other,
      actionItems: [
        {
          id: "action-1",
          actionType: "get_approval",
          actor: defaultActor,
          target: "確認を取る",
          summary: `${defaultActor}が確認を取る`,
          missingFields: ["dueDate"],
          sourceFlags: [],
        },
      ],
    };
  }

  return {
    missingInfo,
    requiredActions,
    suggestedQuestions,
    actionItems: actionItems.length > 0 ? actionItems : undefined,
  };
}
