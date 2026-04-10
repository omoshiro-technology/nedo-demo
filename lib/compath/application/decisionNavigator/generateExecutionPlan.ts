/**
 * 実行計画の生成
 * - 選択されたパスに基づいて具体的な実行ステップを生成
 */

import { env } from "../../config/env";
import { generateId, getTimestamp } from "./utils";
import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import type {
  DecisionNavigatorSession,
  ExecutionPlan,
  ExecutionPlanItem,
  ExecutionRisk,
  ExecutionPriority,
} from "./types";

// ============================================================
// LLMベースの実行計画生成
// ============================================================

const EXECUTION_PLAN_SYSTEM_PROMPT = `あなたは実行計画の専門家です。ユーザーが選択した意思決定パスに基づいて、具体的な実行計画を作成してください。

## 出力形式
以下のJSON形式で出力してください。余計な説明は不要です。

{
  "summary": "決定の要約（1-2文）",
  "items": [
    {
      "title": "タスクタイトル",
      "description": "詳細説明（何をどうするか具体的に）",
      "estimatedDuration": "所要時間目安（例: '30分', '1-2時間', '1日'）",
      "priority": "high|medium|low",
      "dependencies": ["依存するタスクのインデックス（0始まり）"]
    }
  ],
  "risks": [
    {
      "description": "リスクの説明",
      "mitigation": "対策"
    }
  ]
}

## ガイドライン
- items は3-7個程度、実行可能な粒度で作成
- 最初のタスクは必ず「準備・確認」系にする
- 最後のタスクは「確認・振り返り」系にする
- priority は全体の進行への影響度で判断（クリティカルパス上ならhigh）
- risks は1-3個、現実的なものを挙げる`;

type LLMExecutionPlanResponse = {
  summary: string;
  items: {
    title: string;
    description: string;
    estimatedDuration?: string;
    priority: string;
    dependencies?: number[];
  }[];
  risks: {
    description: string;
    mitigation: string;
  }[];
};

async function generatePlanByLLM(
  session: DecisionNavigatorSession
): Promise<{ summary: string; items: Omit<ExecutionPlanItem, "id" | "order" | "status">[]; risks: ExecutionRisk[] }> {
  // 選択されたパスの情報を整理
  const selectedNodes = session.nodes.filter(
    (n) => n.status === "selected" || n.status === "recommended"
  );
  const selectedPath = selectedNodes
    .sort((a, b) => {
      const levels = ["strategy", "tactic", "action"];
      return levels.indexOf(a.level) - levels.indexOf(b.level);
    })
    .map((n) => `- [${n.level}] ${n.label}${n.description ? `: ${n.description}` : ""}`)
    .join("\n");

  const userContent = `
## 目的
${session.purpose}

## 選択されたパス
${selectedPath}

## 問題カテゴリ
${session.problemCategory ? `${session.problemCategory.primary}${session.problemCategory.secondary ? ` / ${session.problemCategory.secondary}` : ""}` : "不明"}

上記の意思決定に基づいて、実行計画を作成してください。
`;

  const response = await generateChatCompletion({
    systemPrompt: EXECUTION_PLAN_SYSTEM_PROMPT,
    userContent,
    temperature: 0.3,
    maxTokens: 1024,
  });

  // JSONをパース
  const parsed = parseJsonFromLLMResponse<LLMExecutionPlanResponse>(response);

  // バリデーションと変換
  const validPriorities: ExecutionPriority[] = ["high", "medium", "low"];
  const items = parsed.items.map((item, index) => ({
    title: item.title,
    description: item.description,
    estimatedDuration: item.estimatedDuration,
    priority: validPriorities.includes(item.priority as ExecutionPriority)
      ? (item.priority as ExecutionPriority)
      : "medium",
    dependencies: item.dependencies?.map((d) => `item-${d}`),
  }));

  return {
    summary: parsed.summary,
    items,
    risks: parsed.risks || [],
  };
}

// ============================================================
// フォールバック用のテンプレートベース生成
// ============================================================

function generatePlanByTemplate(
  session: DecisionNavigatorSession
): { summary: string; items: Omit<ExecutionPlanItem, "id" | "order" | "status">[]; risks: ExecutionRisk[] } {
  // 選択されたノードからアクションを抽出
  const selectedNodes = session.nodes.filter(
    (n) => n.status === "selected" || n.status === "recommended"
  );
  const actionNodes = selectedNodes.filter((n) => n.type === "action" || n.level === "action");

  // 基本的な実行計画を生成
  const items: Omit<ExecutionPlanItem, "id" | "order" | "status">[] = [
    {
      title: "準備・関係者への共有",
      description: `「${session.purpose}」について、関係者に決定内容を共有し、協力を依頼する`,
      estimatedDuration: "30分-1時間",
      priority: "high",
    },
  ];

  // アクションノードをタスクに変換
  for (const node of actionNodes) {
    items.push({
      title: node.label,
      description: node.description || `${node.label}を実行する`,
      estimatedDuration: "1-2時間",
      priority: node.riskLevel === "high" ? "high" : "medium",
      relatedNodeId: node.id,
    });
  }

  // 完了確認タスクを追加
  items.push({
    title: "結果確認・振り返り",
    description: "実行結果を確認し、期待通りの効果が得られたか評価する",
    estimatedDuration: "30分",
    priority: "medium",
  });

  // 基本的なリスクを生成
  const risks: ExecutionRisk[] = [
    {
      description: "予期せぬ問題が発生し、計画通りに進まない可能性",
      mitigation: "各ステップでチェックポイントを設け、問題発生時は早期にエスカレーション",
    },
  ];

  // 選択されたノードにリスク情報があれば追加
  const highRiskNodes = selectedNodes.filter((n) => n.riskLevel === "high");
  if (highRiskNodes.length > 0) {
    risks.push({
      description: `高リスク項目（${highRiskNodes.map((n) => n.label).join(", ")}）の失敗リスク`,
      mitigation: "事前に代替案を準備し、失敗時の影響を最小化する",
    });
  }

  return {
    summary: `「${session.purpose}」に対し、${actionNodes.length}つのアクションを実行する計画`,
    items,
    risks,
  };
}

// ============================================================
// メイン関数
// ============================================================

/**
 * 実行計画を生成する
 * - ANTHROPIC_API_KEYがある場合: LLMベース生成
 * - ない場合: テンプレートベース生成
 */
export async function generateExecutionPlan(
  session: DecisionNavigatorSession
): Promise<ExecutionPlan> {
  const now = getTimestamp();
  const planId = generateId();

  let planData: { summary: string; items: Omit<ExecutionPlanItem, "id" | "order" | "status">[]; risks: ExecutionRisk[] };

  if (env.anthropicApiKey) {
    try {
      planData = await generatePlanByLLM(session);
    } catch (error) {
      console.warn("[generateExecutionPlan] LLM generation failed, falling back to template:", error);
      planData = generatePlanByTemplate(session);
    }
  } else {
    planData = generatePlanByTemplate(session);
  }

  // 実行計画アイテムにID、順序、ステータスを付与
  const items: ExecutionPlanItem[] = planData.items.map((item, index) => ({
    id: `item-${index}`,
    order: index + 1,
    status: "pending" as const,
    ...item,
  }));

  const executionPlan: ExecutionPlan = {
    id: planId,
    sessionId: session.id,
    title: `${session.purpose}の実行計画`,
    summary: planData.summary,
    items,
    risks: planData.risks,
    createdAt: now,
    updatedAt: now,
  };

  return executionPlan;
}

/**
 * 実行計画アイテムのステータスを更新する
 */
export function updateExecutionPlanItemStatus(
  plan: ExecutionPlan,
  itemId: string,
  status: ExecutionPlanItem["status"]
): ExecutionPlan {
  const now = getTimestamp();

  return {
    ...plan,
    items: plan.items.map((item) =>
      item.id === itemId ? { ...item, status } : item
    ),
    updatedAt: now,
  };
}
