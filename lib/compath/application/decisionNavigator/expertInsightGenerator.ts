/**
 * エキスパートインサイト生成
 *
 * 現在のノード選択コンテキストに基づいてインサイトを生成
 * - 見落としやすい観点の事前提示
 * - よくある間違いの警告
 * - ベストプラクティスの提案
 */

import { env } from "../../config/env";
import { generateId, getTimestamp } from "./utils";
import { generateChatCompletion } from "../../infrastructure/llm/openaiClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import type {
  ExpertInsight,
  ExpertInsightType,
  InsightTriggerTiming,
  OverlookedWarningDetail,
  GenerateInsightsRequest,
  GenerateInsightsResponse,
} from "../../domain/decisionNavigator/expertThinking/expertInsight";
import type { DecisionViewpoint } from "../../domain/decisionNavigator/expertThinking/types";
import type { Learning } from "../../domain/decisionNavigator/expertThinking/executionResult";
import type { Heuristic, DecisionPattern } from "../../domain/decisionNavigator/knowledgeBase/types";
import { SessionStore } from "./sessionRepository";
import { KnowledgeRepository } from "../../infrastructure/repositories/KnowledgeRepository";

// ============================================================
// 定数
// ============================================================

/** QCDESの見落としやすい観点（経験則）- 製造業特化版 */
const QCDES_OVERLOOKED_VIEWPOINTS: Array<{
  name: string;
  category: "qcdes";
  qcdesType: "quality" | "cost" | "delivery" | "environment" | "safety";
  typicalRisk: string;
  checkpoints: string[];
  manufacturingSpecific?: string[]; // 製造業特有のチェックポイント
  severity: "critical" | "high" | "medium";
}> = [
  {
    name: "安全性",
    category: "qcdes",
    qcdesType: "safety",
    typicalRisk: "安全性を軽視すると、労働災害や設備事故につながる可能性があります",
    severity: "critical",
    checkpoints: [
      "この選択で安全上のリスクはないか？",
      "法令や規制に適合しているか？",
      "緊急時の対応は考慮されているか？",
    ],
    manufacturingSpecific: [
      "緊急停止手順は定義されているか？",
      "作業者の安全距離は確保されているか？",
      "保護具の要件は明確か？",
      "ロックアウト・タグアウト手順は必要か？",
      "危険予知活動（KY活動）は実施したか？",
      "安全パトロールでの指摘事項に対応しているか？",
    ],
  },
  {
    name: "品質",
    category: "qcdes",
    qcdesType: "quality",
    typicalRisk: "品質基準を満たさないと、後工程での不良や顧客クレームにつながります",
    severity: "high",
    checkpoints: [
      "品質基準は明確か？",
      "検査工程は適切か？",
      "トレーサビリティは確保されているか？",
    ],
    manufacturingSpecific: [
      "工程能力（Cp/Cpk）は十分か？",
      "QC工程表の更新は必要か？",
      "初品検査は計画されているか？",
      "計測器の校正は有効か？",
      "変更点管理は実施されるか？",
      "ポカヨケ対策は考慮されているか？",
    ],
  },
  {
    name: "コスト",
    category: "qcdes",
    qcdesType: "cost",
    typicalRisk: "初期コストだけでなく、運用・保守・廃棄コストも考慮が必要です",
    severity: "high",
    checkpoints: [
      "運用コストは見積もったか？",
      "保守・メンテナンスコストは？",
      "隠れたコストはないか？",
    ],
    manufacturingSpecific: [
      "設備の減価償却費は考慮したか？",
      "消耗品・交換部品のコストは？",
      "省エネ・省人化の効果は試算したか？",
      "廃棄・リプレース費用は？",
      "教育訓練コストは含まれているか？",
      "歩留まり・ロス率の影響は？",
    ],
  },
  {
    name: "納期",
    category: "qcdes",
    qcdesType: "delivery",
    typicalRisk: "リードタイムや依存関係を見落とすと、納期遅延につながります",
    severity: "high",
    checkpoints: [
      "リードタイムは把握しているか？",
      "依存関係は整理されているか？",
      "バッファは確保されているか？",
    ],
    manufacturingSpecific: [
      "長納期部品の発注は済んでいるか？",
      "生産計画との整合は取れているか？",
      "設備停止の影響は評価したか？",
      "協力会社の対応可否は確認したか？",
      "立ち上げ期間は十分か？",
      "試作・評価期間は確保されているか？",
    ],
  },
  {
    name: "環境",
    category: "qcdes",
    qcdesType: "environment",
    typicalRisk: "環境への影響を見落とすと、法規制違反や地域問題につながります",
    severity: "high",
    checkpoints: [
      "環境負荷は考慮されているか？",
      "持続可能性の観点は検討したか？",
      "廃棄やリサイクルは考慮されているか？",
    ],
    manufacturingSpecific: [
      "排水・排気の規制値は満たしているか？",
      "騒音・振動の影響は？",
      "化学物質の管理（SDS）は適切か？",
      "産業廃棄物の処理方法は？",
      "省エネ法への対応は必要か？",
      "カーボンニュートラル目標への影響は？",
    ],
  },
];

/** 製造業特有の見落としやすい観点 */
const MANUFACTURING_SPECIFIC_VIEWPOINTS: Array<{
  name: string;
  category: "manufacturing";
  typicalRisk: string;
  checkpoints: string[];
  triggerKeywords: string[]; // この観点が特に重要になるキーワード
}> = [
  {
    name: "保全性（メンテナンス）",
    category: "manufacturing",
    typicalRisk: "保全作業のしやすさを考慮しないと、運用後のコストと停止時間が増大します",
    checkpoints: [
      "保全作業のアクセス性は確保されているか？",
      "交換部品の入手性は？",
      "定期点検の計画は立てやすいか？",
      "予知保全の仕組みは導入できるか？",
    ],
    triggerKeywords: ["設備", "機械", "装置", "ライン", "プラント"],
  },
  {
    name: "作業標準・教育",
    category: "manufacturing",
    typicalRisk: "標準作業手順書や教育体制がないと、品質のばらつきや事故リスクが高まります",
    checkpoints: [
      "作業標準書の作成・更新は必要か？",
      "作業者への教育訓練は計画されているか？",
      "力量評価の基準は明確か？",
      "多能工化への影響は？",
    ],
    triggerKeywords: ["工程", "作業", "オペレーション", "手順", "変更"],
  },
  {
    name: "設備配置・動線",
    category: "manufacturing",
    typicalRisk: "設備配置や動線を軽視すると、生産効率の低下や安全リスクにつながります",
    checkpoints: [
      "作業動線は最適化されているか？",
      "フォークリフト等の通路は確保されているか？",
      "将来の設備増設スペースは？",
      "非常時の避難経路は確保されているか？",
    ],
    triggerKeywords: ["レイアウト", "配置", "動線", "設備", "ライン"],
  },
  {
    name: "法規制・認証",
    category: "manufacturing",
    typicalRisk: "法規制や認証要件を見落とすと、操業停止や市場投入遅延につながります",
    checkpoints: [
      "関連する法規制は把握しているか？（労安法、消防法、建築基準法等）",
      "必要な届出・申請は洗い出したか？",
      "ISO等の認証への影響は？",
      "顧客要求の認証要件は満たしているか？",
    ],
    triggerKeywords: ["規制", "法令", "認証", "ISO", "届出", "申請"],
  },
  {
    name: "サプライチェーン",
    category: "manufacturing",
    typicalRisk: "調達先の能力やリスクを見落とすと、供給停止につながります",
    checkpoints: [
      "代替調達先はあるか？",
      "調達先の生産能力は十分か？",
      "地政学的リスクは考慮したか？",
      "品質保証体制は確認したか？",
    ],
    triggerKeywords: ["調達", "購買", "サプライヤー", "部品", "材料", "外注"],
  },
];

/** 問題カテゴリ別の見落としやすい観点 */
const CATEGORY_SPECIFIC_VIEWPOINTS: Record<string, Array<{
  name: string;
  risk: string;
  checkpoints: string[];
}>> = {
  technical: [
    {
      name: "スケーラビリティ",
      risk: "将来の拡張性を考慮しないと、後で大きな手戻りが発生します",
      checkpoints: ["将来的な規模拡大に対応できるか？", "負荷増加時の対応は？"],
    },
    {
      name: "セキュリティ",
      risk: "セキュリティ対策の不足は、深刻な被害につながります",
      checkpoints: ["セキュリティリスクは評価したか？", "脆弱性対策は十分か？"],
    },
  ],
  organizational: [
    {
      name: "ステークホルダー合意",
      risk: "関係者の合意なしに進めると、後から反対が出て頓挫するリスクがあります",
      checkpoints: ["すべての関係者に説明したか？", "反対意見はないか？"],
    },
    {
      name: "チーム能力",
      risk: "チームのスキルや工数を考慮しないと、実行できない計画になります",
      checkpoints: ["必要なスキルはあるか？", "工数は確保できるか？"],
    },
  ],
  strategic: [
    {
      name: "競合状況",
      risk: "競合の動向を無視すると、市場で不利な立場になります",
      checkpoints: ["競合は何をしているか？", "差別化は可能か？"],
    },
    {
      name: "長期ビジョン",
      risk: "短期的な解決策が長期ビジョンと矛盾する可能性があります",
      checkpoints: ["長期的な方向性と整合しているか？", "将来の選択肢を狭めていないか？"],
    },
  ],
  personal: [
    {
      name: "ワークライフバランス",
      risk: "過度な負荷は燃え尽きや健康問題につながります",
      checkpoints: ["負荷は適切か？", "持続可能な働き方か？"],
    },
  ],
};

// ============================================================
// メイン関数
// ============================================================

/**
 * インサイトを生成
 */
export async function generateInsights(
  request: GenerateInsightsRequest
): Promise<GenerateInsightsResponse> {
  const { sessionId, currentNodeId, context, triggerTiming } = request;

  const session = await SessionStore.findById(sessionId);
  if (!session) {
    throw new Error("セッションが見つかりません");
  }

  const insights: ExpertInsight[] = [];
  const overlookedWarnings: OverlookedWarningDetail[] = [];

  // 1. ルールベースのインサイト生成
  const ruleBasedInsights = generateRuleBasedInsights(
    context?.purpose || session.purpose,
    context?.problemCategory || session.problemCategory?.primary,
    triggerTiming
  );
  insights.push(...ruleBasedInsights);

  // 2. 見落とし警告の生成（製造業特化版）
  const warnings = generateOverlookedWarnings(
    context?.problemCategory || session.problemCategory?.primary,
    currentNodeId,
    context?.purpose || session.purpose,
    session.selectionHistory.map((h) => h.nodeLabel)
  );
  overlookedWarnings.push(...warnings);

  // 3. Learning/ナレッジベースからのインサイト生成（Phase 7-6）
  const knowledgeBasedInsights = generateKnowledgeBasedInsights(
    context?.purpose || session.purpose,
    context?.problemCategory || session.problemCategory?.primary,
    session.selectionHistory.map((h) => h.nodeLabel),
    triggerTiming
  );
  insights.push(...knowledgeBasedInsights);

  // 4. LLMによるインサイト生成（APIキーがある場合）
  if (env.openaiApiKey && triggerTiming === "on_node_selection") {
    try {
      const llmInsights = await generateLLMInsights(
        session.purpose,
        session.selectionHistory.map((h) => h.nodeLabel),
        currentNodeId ? session.nodes.find((n) => n.id === currentNodeId) : undefined
      );
      insights.push(...llmInsights);
    } catch (error) {
      console.warn("[generateInsights] LLM insight generation failed:", error);
    }
  }

  // 全体リスクスコアの計算
  const overallRiskScore = calculateOverallRiskScore(insights, overlookedWarnings);

  return {
    insights,
    overlookedWarnings,
    overallRiskScore,
  };
}

// ============================================================
// ルールベースのインサイト生成
// ============================================================

function generateRuleBasedInsights(
  purpose: string,
  problemCategory: string | undefined,
  triggerTiming: InsightTriggerTiming
): ExpertInsight[] {
  const insights: ExpertInsight[] = [];
  const now = getTimestamp();

  // QCDESの見落とし警告
  for (const viewpoint of QCDES_OVERLOOKED_VIEWPOINTS) {
    insights.push({
      id: generateId(),
      type: "overlooked_viewpoint",
      triggerTiming: {
        timing: triggerTiming,
        condition: `qcdes_${viewpoint.qcdesType}`,
      },
      content: {
        title: `${viewpoint.name}の観点`,
        message: viewpoint.typicalRisk,
        reflectionQuestions: viewpoint.checkpoints,
      },
      targetAudience: "all",
      importance: viewpoint.qcdesType === "safety" ? "critical" : "medium",
      stats: { displayCount: 0, helpfulCount: 0, helpfulRate: 0, dismissedCount: 0 },
      isActive: true,
      createdAt: now,
      updatedAt: now,
      source: "pattern_extracted",
    });
  }

  // カテゴリ特有の見落とし
  if (problemCategory && CATEGORY_SPECIFIC_VIEWPOINTS[problemCategory]) {
    for (const viewpoint of CATEGORY_SPECIFIC_VIEWPOINTS[problemCategory]) {
      insights.push({
        id: generateId(),
        type: "overlooked_viewpoint",
        triggerTiming: {
          timing: triggerTiming,
          problemCategories: [problemCategory],
        },
        content: {
          title: viewpoint.name,
          message: viewpoint.risk,
          reflectionQuestions: viewpoint.checkpoints,
        },
        targetAudience: "beginner",
        importance: "high",
        stats: { displayCount: 0, helpfulCount: 0, helpfulRate: 0, dismissedCount: 0 },
        isActive: true,
        createdAt: now,
        updatedAt: now,
        source: "pattern_extracted",
      });
    }
  }

  return insights;
}

// ============================================================
// 見落とし警告の生成
// ============================================================

/**
 * 見落とし警告の生成（製造業特化版）
 * Sentinel Agent の核心機能
 */
function generateOverlookedWarnings(
  problemCategory: string | undefined,
  currentNodeId: string | undefined,
  purpose?: string,
  selectedPath?: string[]
): OverlookedWarningDetail[] {
  const warnings: OverlookedWarningDetail[] = [];
  const now = getTimestamp();

  // 1. QCDESの見落としやすい観点から警告を生成（製造業特化版）
  for (const vp of QCDES_OVERLOOKED_VIEWPOINTS) {
    // 製造業特有のチェックポイントを含める
    const allCheckpoints = [
      ...vp.checkpoints,
      ...(vp.manufacturingSpecific || []),
    ];

    const viewpoint: DecisionViewpoint = {
      name: vp.name,
      category: vp.category,
      qcdesType: vp.qcdesType,
      perspective: `${vp.name}の観点から検討が必要`,
      evaluation: { score: 0, comment: "未評価" },
      isOftenOverlooked: true,
      overlookedRisk: vp.typicalRisk,
      checkpoints: allCheckpoints,
    };

    // 重要度に基づく警告の優先度設定
    const importance = vp.severity === "critical" ? "critical" :
                       vp.severity === "high" ? "high" : "medium";

    warnings.push({
      id: generateId(),
      viewpoint,
      warning: vp.typicalRisk,
      potentialConsequences: getConsequencesByQcdesType(vp.qcdesType),
      checklist: allCheckpoints.slice(0, 6).map((item, index) => ({
        item,
        isChecked: false,
        importance: index < 3 ? importance : "medium", // 最初の3つは特に重要
      })),
      triggeredByNodeId: currentNodeId,
      createdAt: now,
    });
  }

  // 2. 目的やパスに基づく製造業特有の観点を追加
  const contextKeywords = extractContextKeywords(
    purpose || "",
    selectedPath || []
  );

  for (const mvp of MANUFACTURING_SPECIFIC_VIEWPOINTS) {
    // キーワードマッチで関連性を判定
    const isRelevant = mvp.triggerKeywords.some(
      (keyword) => contextKeywords.some((ck) => ck.includes(keyword) || keyword.includes(ck))
    );

    if (isRelevant) {
      const viewpoint: DecisionViewpoint = {
        name: mvp.name,
        category: "value", // 製造業特有はvalueカテゴリとして扱う
        perspective: mvp.typicalRisk,
        evaluation: { score: 0, comment: "未評価" },
        isOftenOverlooked: true,
        overlookedRisk: mvp.typicalRisk,
        checkpoints: mvp.checkpoints,
      };

      warnings.push({
        id: generateId(),
        viewpoint,
        warning: mvp.typicalRisk,
        potentialConsequences: [
          `${mvp.name}を軽視すると、運用開始後に大きな問題が発生する可能性があります`,
        ],
        checklist: mvp.checkpoints.map((item) => ({
          item,
          isChecked: false,
          importance: "high",
        })),
        triggeredByNodeId: currentNodeId,
        createdAt: now,
      });
    }
  }

  return warnings;
}

/**
 * QCDES種別ごとの具体的な影響を返す
 */
function getConsequencesByQcdesType(qcdesType: string): string[] {
  const consequences: Record<string, string[]> = {
    safety: [
      "労働災害の発生リスクがあります",
      "設備事故による操業停止の可能性があります",
      "法令違反による行政処分のリスクがあります",
    ],
    quality: [
      "後工程での不良発生により手戻りが発生します",
      "顧客クレームによる信頼低下のリスクがあります",
      "市場流出による回収コストが発生する可能性があります",
    ],
    cost: [
      "当初見積もりを大幅に超過するリスクがあります",
      "運用開始後の予期せぬコスト増大につながります",
      "投資回収期間が長期化する可能性があります",
    ],
    delivery: [
      "生産計画に影響を及ぼす可能性があります",
      "顧客への納期遅延リスクがあります",
      "他プロジェクトへの連鎖的な影響が生じます",
    ],
    environment: [
      "環境規制違反による操業停止リスクがあります",
      "地域住民との関係悪化につながる可能性があります",
      "環境対策の追加コストが発生します",
    ],
  };

  return consequences[qcdesType] || [
    `${qcdesType}を考慮しないと、予期せぬ問題が発生する可能性があります`,
  ];
}

// ============================================================
// LLMによるインサイト生成
// ============================================================

/**
 * 製造業ベテランエンジニアとしてのインサイト生成プロンプト
 * Sentinel Agent の核となる「兆しを捉え、事故を防ぐ問いかけ」を実現
 */
const INSIGHT_SYSTEM_PROMPT = `あなたは製造業で30年以上の経験を持つベテランエンジニアです。
若手エンジニアの意思決定を支援するため、見落としやすい観点や注意点を「先輩からのアドバイス」として伝えてください。

## あなたの役割（Sentinel Agent）
- 兆しを捉え、事故を防ぐ問いかけをする
- 若手が後で「先輩に言われていればよかった」と思うことを事前に伝える
- 経験に基づく暗黙知を言語化して共有する

## 出力形式
以下のJSON形式で出力してください。

{
  "insights": [
    {
      "type": "overlooked_viewpoint" | "common_mistake" | "best_practice" | "experienced_tip",
      "title": "タイトル（簡潔に）",
      "message": "メッセージ（1-2文、経験者の口調で）",
      "importance": "critical" | "high" | "medium" | "low",
      "qcdesCategory": "quality" | "cost" | "delivery" | "environment" | "safety" | null,
      "reflectionQuestions": ["確認すべき具体的な質問1", "質問2"]
    }
  ]
}

## QCDES観点（製造業の基本）
必ず以下の5つの観点から見落としがないかチェックしてください：

1. **Quality（品質）**
   - 工程能力は十分か？
   - 検査工程に抜けはないか？
   - 変更点管理は必要か？
   - ポカヨケは考えたか？

2. **Cost（コスト）**
   - 初期費用だけでなくランニングコストは？
   - 歩留まり・ロス率の影響は？
   - 設備の減価償却は？

3. **Delivery（納期）**
   - 長納期部品はないか？
   - 立ち上げ期間は十分か？
   - 生産計画への影響は？

4. **Environment（環境）**
   - 排水・排気の規制は？
   - 騒音・振動の影響は？
   - 産業廃棄物の処理は？

5. **Safety（安全）**
   - 緊急停止手順は定義されているか？
   - 作業者の安全距離は？
   - 危険予知は実施したか？

## ガイドライン
- **若手が見落としがちな観点を優先**
- 「〜したほうがいいよ」「〜は確認した？」という口調で
- 具体的で実行可能なアドバイスを
- 2-4個のインサイトを生成
- 批判的ではなく、建設的に
- 過去の失敗事例を踏まえた警告も含める`;

type LLMInsightResponse = {
  insights: Array<{
    type: ExpertInsightType;
    title: string;
    message: string;
    importance: "critical" | "high" | "medium" | "low";
    reflectionQuestions?: string[];
  }>;
};

async function generateLLMInsights(
  purpose: string,
  selectedPath: string[],
  currentNode?: { label: string; description?: string }
): Promise<ExpertInsight[]> {
  const userContent = `
## 目的
${purpose}

## これまでの選択
${selectedPath.join(" → ") || "まだ選択なし"}

${currentNode ? `## 現在検討中の選択肢\n${currentNode.label}${currentNode.description ? `: ${currentNode.description}` : ""}` : ""}

この状況で、見落としやすい観点や注意点を教えてください。
`;

  const response = await generateChatCompletion({
    systemPrompt: INSIGHT_SYSTEM_PROMPT,
    userContent,
    temperature: 0.5,
    maxTokens: 512,
  });

  // JSONをパース
  let parsed: LLMInsightResponse;
  try {
    parsed = parseJsonFromLLMResponse<LLMInsightResponse>(response);
  } catch {
    return [];
  }
  const now = getTimestamp();

  return (parsed.insights || []).map((insight) => ({
    id: generateId(),
    type: insight.type || "experienced_tip",
    triggerTiming: {
      timing: "on_node_selection" as InsightTriggerTiming,
    },
    content: {
      title: insight.title,
      message: insight.message,
      reflectionQuestions: insight.reflectionQuestions,
    },
    targetAudience: "all" as const,
    importance: insight.importance || "medium",
    stats: { displayCount: 0, helpfulCount: 0, helpfulRate: 0, dismissedCount: 0 },
    isActive: true,
    createdAt: now,
    updatedAt: now,
    source: "llm_generated" as const,
  }));
}

// ============================================================
// リスクスコア計算
// ============================================================

function calculateOverallRiskScore(
  insights: ExpertInsight[],
  warnings: OverlookedWarningDetail[]
): number {
  let score = 0;

  // インサイトの重要度に基づくスコア
  for (const insight of insights) {
    switch (insight.importance) {
      case "critical":
        score += 25;
        break;
      case "high":
        score += 15;
        break;
      case "medium":
        score += 8;
        break;
      case "low":
        score += 3;
        break;
    }
  }

  // 警告の数に基づくスコア
  score += warnings.length * 10;

  // 100を上限とする
  return Math.min(score, 100);
}

// ============================================================
// ナレッジベース（Learning統合）からのインサイト生成
// Phase 7-6: 蓄積されたLearning/Heuristic/Patternを活用
// ============================================================

/**
 * ナレッジベースから関連するインサイトを生成
 */
function generateKnowledgeBasedInsights(
  purpose: string,
  problemCategory: string | undefined,
  selectedPath: string[],
  triggerTiming: InsightTriggerTiming
): ExpertInsight[] {
  const insights: ExpertInsight[] = [];
  const now = getTimestamp();

  // 1. 関連するLearningを検索
  const contextKeywords = extractContextKeywords(purpose, selectedPath);
  const relatedLearnings = KnowledgeRepository.findLearningsByContext(contextKeywords);

  // Learningからインサイトを生成
  for (const learning of relatedLearnings.slice(0, 3)) {
    const insight = convertLearningToInsight(learning, triggerTiming, now);
    insights.push(insight);
  }

  // 2. 関連するHeuristicを検索
  const domains = problemCategory ? [problemCategory] : ["general"];
  const relatedHeuristics = KnowledgeRepository.findHeuristicsByDomain(domains);
  const keywordHeuristics = KnowledgeRepository.findHeuristicsByKeywords(contextKeywords);

  // 重複排除してマージ
  const heuristicIds = new Set<string>();
  const allHeuristics: Heuristic[] = [];
  for (const h of [...relatedHeuristics, ...keywordHeuristics]) {
    if (!heuristicIds.has(h.id)) {
      heuristicIds.add(h.id);
      allHeuristics.push(h);
    }
  }

  // 高信頼度のHeuristicからインサイトを生成
  const highReliabilityHeuristics = allHeuristics
    .filter((h) => h.reliability.score >= 70)
    .sort((a, b) => b.reliability.score - a.reliability.score)
    .slice(0, 2);

  for (const heuristic of highReliabilityHeuristics) {
    const insight = convertHeuristicToInsight(heuristic, triggerTiming, now);
    insights.push(insight);
  }

  // 3. 失敗パターンから警告インサイトを生成
  const failurePatterns = KnowledgeRepository.findFailurePatterns(3);
  for (const pattern of failurePatterns) {
    const insight = convertFailurePatternToWarningInsight(pattern, triggerTiming, now);
    insights.push(insight);
  }

  return insights;
}

/**
 * コンテキストからキーワードを抽出
 */
function extractContextKeywords(purpose: string, selectedPath: string[]): string[] {
  const keywords = new Set<string>();

  // purposeからキーワードを抽出（簡易的な形態素解析）
  const purposeWords = purpose.split(/[\s、。,.\-_]+/).filter((w) => w.length >= 2);
  purposeWords.forEach((w) => keywords.add(w));

  // 選択パスからキーワードを抽出
  for (const label of selectedPath) {
    const pathWords = label.split(/[\s、。,.\-_：:]+/).filter((w) => w.length >= 2);
    pathWords.forEach((w) => keywords.add(w));
  }

  return Array.from(keywords).slice(0, 10); // 最大10キーワード
}

/**
 * LearningをExpertInsightに変換
 */
function convertLearningToInsight(
  learning: Learning,
  triggerTiming: InsightTriggerTiming,
  now: string
): ExpertInsight {
  // カテゴリに応じてインサイトタイプを決定
  const insightType: ExpertInsightType =
    learning.category === "failure_pattern"
      ? "common_mistake"
      : learning.category === "success_pattern"
      ? "best_practice"
      : learning.category === "heuristic"
      ? "experienced_tip"
      : "overlooked_viewpoint";

  // 重要度を決定（確認回数と信頼度から）
  const importance: "critical" | "high" | "medium" | "low" =
    learning.confirmationCount >= 5
      ? "critical"
      : learning.confirmationCount >= 3
      ? "high"
      : learning.confidence >= 70
      ? "medium"
      : "low";

  return {
    id: generateId(),
    type: insightType,
    triggerTiming: {
      timing: triggerTiming,
      condition: `learning_${learning.category}`,
    },
    content: {
      title: `【過去の学び】${learning.category === "failure_pattern" ? "⚠️ 注意" : "💡 ヒント"}`,
      message: learning.content,
      reflectionQuestions: learning.applicableConditions.length > 0
        ? [`以下の条件に該当しますか？: ${learning.applicableConditions.join(", ")}`]
        : undefined,
    },
    targetAudience: "all",
    importance,
    stats: {
      displayCount: 0,
      helpfulCount: 0,
      helpfulRate: 0,
      dismissedCount: 0,
    },
    isActive: true,
    createdAt: now,
    updatedAt: now,
    source: "pattern_extracted",
  };
}

/**
 * HeuristicをExpertInsightに変換
 */
function convertHeuristicToInsight(
  heuristic: Heuristic,
  triggerTiming: InsightTriggerTiming,
  now: string
): ExpertInsight {
  // 信頼度に応じて重要度を設定
  const importance: "critical" | "high" | "medium" | "low" =
    heuristic.reliability.score >= 90
      ? "critical"
      : heuristic.reliability.score >= 80
      ? "high"
      : heuristic.reliability.score >= 70
      ? "medium"
      : "low";

  // 信頼度マーク
  const reliabilityMark =
    heuristic.reliability.score >= 90
      ? "★★★"
      : heuristic.reliability.score >= 80
      ? "★★☆"
      : "★☆☆";

  return {
    id: generateId(),
    type: "experienced_tip",
    triggerTiming: {
      timing: triggerTiming,
      condition: `heuristic_${heuristic.domain.join("_")}`,
    },
    content: {
      title: `【経験則 ${reliabilityMark}】`,
      message: heuristic.rule,
      reflectionQuestions: heuristic.exceptions?.length
        ? [`例外ケース: ${heuristic.exceptions.map((e) => e.condition).join(", ")}`]
        : [heuristic.description],
    },
    targetAudience: "beginner",
    importance,
    stats: {
      displayCount: heuristic.usageStats.timesApplied,
      helpfulCount: Math.round(heuristic.usageStats.timesApplied * heuristic.usageStats.successRate / 100),
      helpfulRate: heuristic.usageStats.successRate,
      dismissedCount: 0,
    },
    isActive: heuristic.isActive,
    createdAt: heuristic.createdAt,
    updatedAt: now,
    source: "pattern_extracted",
  };
}

/**
 * 失敗パターンを警告インサイトに変換
 */
function convertFailurePatternToWarningInsight(
  pattern: DecisionPattern,
  triggerTiming: InsightTriggerTiming,
  now: string
): ExpertInsight {
  return {
    id: generateId(),
    type: "common_mistake",
    triggerTiming: {
      timing: triggerTiming,
      condition: `failure_pattern_${pattern.id}`,
    },
    content: {
      title: `⚠️ 過去の失敗事例: ${pattern.name}`,
      message: pattern.lessons.join("\n"),
      relatedCases: pattern.relatedSessionIds?.slice(0, 3).map((sessionId) => ({
        summary: `セッション: ${sessionId}`,
        outcome: "failure" as const,
        lesson: pattern.lessons[0] || "",
      })),
      reflectionQuestions: pattern.recommendations,
    },
    targetAudience: "all",
    importance: pattern.occurrences >= 3 ? "high" : "medium",
    stats: {
      displayCount: 0,
      helpfulCount: 0,
      helpfulRate: 0,
      dismissedCount: 0,
    },
    isActive: true,
    createdAt: pattern.firstOccurredAt,
    updatedAt: now,
    source: "pattern_extracted",
  };
}
