/**
 * 建設プロジェクトシナリオ
 *
 * ゼネコン・デベロッパー向け: 工期・品質・コスト判断のデモ
 */

import type { DemoScenario } from "./types";
import type { KnowledgeTransferConditions } from "../../types/chat";
import type { SimulationCondition } from "../../types/decisionNavigator";
import { CONSTRUCTION_MEETING_MINUTES_SET, CONSTRUCTION_KNOWLEDGE_SET } from "./sampleData/constructionSamples";
import { CONSTRUCTION_SIMILAR_CASES } from "./sampleData/constructionSimilarCases";

// ── 条件ヘルパー（建設用ラベルマッピング） ─────────────

function getScheduleConstraintValue(preCollected?: KnowledgeTransferConditions): string {
  if (!preCollected?.startupFrequency) return "標準";
  switch (preCollected.startupFrequency) {
    case "low": return "余裕あり（3ヶ月以上）";
    case "medium": return "標準";
    case "high": return "逼迫（1ヶ月以内）";
    default: return "標準";
  }
}

function getBudgetScaleValue(preCollected?: KnowledgeTransferConditions): string {
  if (!preCollected?.recoveryTimeTarget) return "中規模（1〜5億）";
  switch (preCollected.recoveryTimeTarget) {
    case "strict": return "小規模（1億未満）";
    case "moderate": return "中規模（1〜5億）";
    case "flexible": return "大規模（5億以上）";
    default: return "中規模（1〜5億）";
  }
}

function getEnvironmentConstraintValue(preCollected?: KnowledgeTransferConditions): string {
  if (!preCollected?.spaceConstraint) return "一般的";
  switch (preCollected.spaceConstraint) {
    case "tight": return "厳しい（住宅密集地）";
    case "standard": return "一般的";
    case "ample": return "緩い（郊外・工業地帯）";
    default: return "一般的";
  }
}

function createConstructionConditions(preCollected?: KnowledgeTransferConditions): SimulationCondition[] {
  const conditions: SimulationCondition[] = [];

  if (preCollected?.startupFrequency) {
    conditions.push({
      id: "cond-1",
      criteriaId: "c1",
      label: "工期制約",
      value: getScheduleConstraintValue(preCollected),
      options: ["余裕あり（3ヶ月以上）", "標準", "逼迫（1ヶ月以内）"],
      isPreSelected: true,
    });
  }

  if (preCollected?.recoveryTimeTarget) {
    conditions.push({
      id: "cond-2",
      criteriaId: "c2",
      label: "予算規模",
      value: getBudgetScaleValue(preCollected),
      options: ["小規模（1億未満）", "中規模（1〜5億）", "大規模（5億以上）"],
      isPreSelected: true,
    });
  }

  if (preCollected?.spaceConstraint) {
    conditions.push({
      id: "cond-3",
      criteriaId: "c3",
      label: "周辺環境制約",
      value: getEnvironmentConstraintValue(preCollected),
      options: ["厳しい（住宅密集地）", "一般的", "緩い（郊外・工業地帯）"],
      isPreSelected: true,
    });
  }

  return conditions;
}

function createAllConstructionConditions(preCollected?: KnowledgeTransferConditions): SimulationCondition[] {
  return [
    {
      id: "cond-1",
      criteriaId: "c1",
      label: "工期制約",
      value: getScheduleConstraintValue(preCollected),
      options: ["余裕あり（3ヶ月以上）", "標準", "逼迫（1ヶ月以内）"],
      isPreSelected: !!preCollected?.startupFrequency,
    },
    {
      id: "cond-2",
      criteriaId: "c2",
      label: "予算規模",
      value: getBudgetScaleValue(preCollected),
      options: ["小規模（1億未満）", "中規模（1〜5億）", "大規模（5億以上）"],
      isPreSelected: !!preCollected?.recoveryTimeTarget,
    },
    {
      id: "cond-3",
      criteriaId: "c3",
      label: "周辺環境制約",
      value: getEnvironmentConstraintValue(preCollected),
      options: ["厳しい（住宅密集地）", "一般的", "緩い（郊外・工業地帯）"],
      isPreSelected: !!preCollected?.spaceConstraint,
    },
  ];
}

// ── シナリオ定義 ─────────────

export const constructionScenario: DemoScenario = {
  id: "construction",
  name: "建設プロジェクト",
  description: "ゼネコン向け工期・品質・コスト判断支援",

  demoActions: [
    {
      id: "demo-analysis",
      label: "月次報告分析",
      description: "工事進捗月次報告書を分析",
      icon: "search",
      prompt: "【サンプル議事録データ】\n工事進捗月次報告書を分析してください",
      sampleDataId: "meeting_minutes",
    },
    {
      id: "demo-knowledge",
      label: "安全報告解析",
      description: "安全パトロール報告を構造解析",
      icon: "document",
      prompt: "【サンプル報告書データ】\n安全パトロール報告書を構造解析してください",
      sampleDataId: "trouble_report",
    },
    {
      id: "demo-knowledge-transfer",
      label: "工期判断支援",
      description: "過去の工期関連判断を参照",
      icon: "search",
      prompt: "【技術伝承デモ】\n工期遅延が発生しており、外注増員か工期延長か判断が必要。品質と予算のバランスを考慮。",
      sampleDataId: null,
    },
    {
      id: "demo-proposal",
      label: "提案書",
      description: "工事改善提案書を作成",
      icon: "document",
      prompt: "工期短縮と品質確保を両立する改善提案書を作成したい。外注活用と工法変更の比較を含めて検討。",
      sampleDataId: null,
    },
  ],

  customerProfiles: [
    {
      id: "taisei_tokyo",
      name: "大成建設 東京本社建設部 様",
      industry: "manufacturing",
      currentIssues: ["load_variation", "cost_pressure", "skill_transfer"],
      kpiPriority: "availability",
      additionalContext: "都心再開発プロジェクト（RC造30F）。工期遅延1ヶ月、近隣対策が課題。ベテラン現場監督の退職予定あり。",
    },
    {
      id: "shimizu_rd",
      name: "清水建設 技術研究所 様",
      industry: "manufacturing",
      currentIssues: ["aging_equipment", "future_expansion", "cost_pressure"],
      kpiPriority: "cost",
      additionalContext: "既存工法の効率化と新工法の導入検討。DX推進による生産性向上が経営課題。",
    },
    {
      id: "mitsui_redev",
      name: "三井不動産 再開発事業部 様",
      industry: "manufacturing",
      currentIssues: ["unexpected_trouble", "load_variation", "availability_priority"],
      kpiPriority: "flexibility",
      additionalContext: "複合施設の再開発。テナント入居時期が決定済みのため、工期厳守が最重要。設計変更への柔軟対応が必要。",
    },
  ],

  defaultEvaluationPointRows: [
    {
      id: "bufferCapacity",
      title: "工期リスク管理",
      importance: "high",
      currentStatus: "concerning",
    },
    {
      id: "switchingImpact",
      title: "コスト超過対策",
      importance: "high",
      currentStatus: "limited",
    },
    {
      id: "contingencyOptions",
      title: "品質確保体制",
      importance: "medium",
      currentStatus: "concerning",
    },
  ],

  pastCases: [
    {
      id: "case-001",
      caseNumber: "C19-001234",
      date: "2019/06",
      summary: "外注増員による工期短縮：追加予算500万円で2週間回復",
      purpose: "工期遅延1ヶ月に対し、外注増員と工法変更を比較検討。コスト効率と品質維持を両立する方策を選定。",
      decisions: [
        {
          criteriaId: "criteria-1",
          criteriaLabel: "コスト対応は？",
          selectedOption: "追加予算承認",
          rationale: "工期遅延による違約金リスクが追加予算を上回ると判断。外注増員で工期短縮を優先",
        },
        {
          criteriaId: "criteria-2",
          criteriaLabel: "工法変更は？",
          selectedOption: "一部変更",
          rationale: "鉄骨建方の順序を変更し並行作業を増やすことで効率化。品質基準は維持",
        },
        {
          criteriaId: "criteria-3",
          criteriaLabel: "品質管理は？",
          selectedOption: "検査強化",
          rationale: "外注増員に伴い品質リスクが増加するため、中間検査を追加して品質を担保",
        },
      ],
      outcome: "追加予算500万円で外注3社を投入、2週間の工期回復に成功。品質問題なし",
      similarity: 0.85,
      veteranInsight: "【ベテランの経験談】外注増員は手っ取り早いが、品質管理の手間が増える。増員前に検査体制を強化しておくのが鍵です。",
    },
    {
      id: "case-002",
      caseNumber: "C20-002345",
      date: "2020/03",
      summary: "品質優先で工期2週間延長：品質基準未達を未然防止",
      purpose: "コンクリート打設の品質にばらつきが発生。工期を延長して品質を確保するか、現行ペースで進めるかの判断。",
      decisions: [
        {
          criteriaId: "criteria-3",
          criteriaLabel: "品質管理は？",
          selectedOption: "全数検査",
          rationale: "品質不具合の手戻りコストは工期延長コストの3倍以上。品質確保を優先",
        },
        {
          criteriaId: "criteria-1",
          criteriaLabel: "コスト対応は？",
          selectedOption: "発注者協議",
          rationale: "品質確保のための工期延長を発注者に説明し、追加費用の分担を協議",
        },
      ],
      outcome: "工期2週間延長を発注者了承、品質基準を完全達成。後工程での手戻りゼロ",
      similarity: 0.78,
      veteranInsight: "【ベテランの経験談】品質問題は早期に発注者へ報告すること。隠して後で発覚すると信頼を失います。正直に報告する方が結果的に良い。",
    },
    {
      id: "case-003",
      caseNumber: "C21-003456",
      date: "2021/08",
      summary: "設計変更対応：発注者との費用分担協議で解決",
      purpose: "施工中に地中障害物が発見され設計変更が必要に。追加費用300万円の負担先と工期への影響を検討。",
      decisions: [
        {
          criteriaId: "criteria-1",
          criteriaLabel: "コスト対応は？",
          selectedOption: "費用分担協議",
          rationale: "契約約款に基づき、予見不可能な地中障害は発注者負担が原則。丁寧に協議",
        },
        {
          criteriaId: "criteria-2",
          criteriaLabel: "工法変更は？",
          selectedOption: "全面変更",
          rationale: "障害物の規模が大きく、迂回ルートでの施工が必要。工法を根本的に見直し",
        },
      ],
      outcome: "発注者が追加費用を負担、工期は予備日消化で対応。契約変更手続きも完了",
      similarity: 0.72,
      veteranInsight: "【ベテランの経験談】設計変更は記録が命。日報・写真・測量データを漏れなく残しておくと、費用協議がスムーズに進みます。",
    },
    {
      id: "case-004",
      caseNumber: "C22-004567",
      date: "2022/01",
      summary: "代替サプライヤー採用：資材調達遅延を2週間で解消",
      purpose: "鉄骨資材の調達遅延が発生。代替サプライヤーへの切替リスクと、遅延受容のコスト比較。",
      decisions: [
        {
          criteriaId: "criteria-2",
          criteriaLabel: "工法変更は？",
          selectedOption: "部分変更",
          rationale: "仮設計画を変更し、鉄骨建方の順序を入れ替えて調達待ちの影響を最小化",
        },
        {
          criteriaId: "criteria-1",
          criteriaLabel: "コスト対応は？",
          selectedOption: "自社負担",
          rationale: "代替サプライヤーの単価増（約5%増）は自社で吸収。工期遅延のリスクを回避",
        },
      ],
      outcome: "B社に切替完了、納期を2週間短縮。品質試験も合格",
      similarity: 0.68,
      veteranInsight: "【ベテランの経験談】調達先は常に2社以上確保しておくこと。1社依存は危険です。平時から関係を作っておくのが大事。",
    },
    {
      id: "case-005",
      caseNumber: "C23-005678",
      date: "2023/05",
      summary: "近隣騒音対策：作業時間短縮で住民理解を獲得",
      purpose: "近隣住民からの騒音クレームが多発。作業効率と近隣関係のバランスを検討。",
      decisions: [
        {
          criteriaId: "criteria-3",
          criteriaLabel: "品質管理は？",
          selectedOption: "施工計画見直し",
          rationale: "低騒音工法の採用と作業時間帯の見直しで、品質を落とさず騒音を低減",
        },
        {
          criteriaId: "criteria-1",
          criteriaLabel: "コスト対応は？",
          selectedOption: "追加予算承認",
          rationale: "低騒音重機のリース費用増（月額30万円）を承認。近隣トラブル回避の方が重要",
        },
      ],
      outcome: "作業時間を9:00-17:00に短縮、低騒音重機導入。クレーム件数80%減",
      similarity: 0.62,
      veteranInsight: "【ベテランの経験談】近隣対策は先手が重要。問題が起きてからでは遅い。着工前の説明会と定期的な情報提供で信頼関係を作りましょう。",
    },
  ],

  knowledgeTransferQuestions: [
    {
      id: "startupFrequency",
      title: "1. 工期の状況",
      question: "現在の工期状況はどのくらい厳しいですか？",
      intent: "工期が逼迫している場合は即効性のある対策が必要、余裕がある場合はコスト最適化を優先できます",
      options: [
        { value: "high", label: "逼迫", description: "遅延発生、早急な対応が必要" },
        { value: "medium", label: "標準", description: "計画通り進行中" },
        { value: "low", label: "余裕あり", description: "予備日が十分ある" },
      ],
    },
    {
      id: "recoveryTimeTarget",
      title: "2. 予算制約",
      question: "追加予算の確保はどの程度可能ですか？",
      intent: "予算に余裕がある場合は増員・工法変更が選択肢に、厳しい場合は工期延長での調整が現実的です",
      options: [
        { value: "strict", label: "厳しい", description: "追加予算確保が困難" },
        { value: "moderate", label: "協議可能", description: "発注者との協議で対応" },
        { value: "flexible", label: "柔軟", description: "予備費に余裕あり" },
      ],
    },
    {
      id: "spaceConstraint",
      title: "3. 周辺環境",
      question: "施工現場の周辺環境の制約はありますか？",
      intent: "住宅密集地では騒音・振動対策が必須、郊外なら作業時間や工法の自由度が高くなります",
      options: [
        { value: "tight", label: "厳しい", description: "住宅密集地、騒音制限あり" },
        { value: "standard", label: "一般的", description: "標準的な都市部" },
        { value: "ample", label: "緩い", description: "郊外・工業地帯" },
      ],
    },
  ],

  createConditions: createConstructionConditions,
  createAllConditions: createAllConstructionConditions,

  sampleMeetingMinutesSet: CONSTRUCTION_MEETING_MINUTES_SET,
  sampleKnowledgeSet: CONSTRUCTION_KNOWLEDGE_SET,
  similarCases: CONSTRUCTION_SIMILAR_CASES,
};
