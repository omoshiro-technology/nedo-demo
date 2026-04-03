/**
 * 知財戦略シナリオ
 *
 * オムロン技術・知財本部向け: センシング×AI技術の知財戦略デモ
 */

import type { DemoScenario } from "./types";
import { DEMO_CUSTOMER_PROFILES, DEFAULT_EVALUATION_POINT_ROWS } from "../proposalDemoData";
import { DEMO_ACTIONS } from "../chatDemoData";
import { DUMMY_PAST_CASES } from "../decisionNavigatorDemoData";
import { createDummyConditions, createAllAvailableConditions } from "../decisionNavigatorDemoHelpers";
import {
  SAMPLE_MEETING_MINUTES,
  SAMPLE_CRITICAL_DECISIONS,
  SAMPLE_AMBIGUOUS_DECISIONS,
  SAMPLE_DATA_DESCRIPTIONS,
} from "../sampleDecisionData";
import {
  SAMPLE_TROUBLE_REPORT_COMPLETE,
  SAMPLE_TROUBLE_REPORT_INCOMPLETE,
  SAMPLE_INVESTIGATION_MEMO,
  SAMPLE_KNOWLEDGE_DESCRIPTIONS,
} from "../sampleKnowledgeData";
import { DEMO_SIMILAR_CASES } from "../similarCaseDemoData";

export const ipStrategyScenario: DemoScenario = {
  id: "ip-strategy",
  name: "知財戦略",
  description: "センシング×AI技術の知財戦略・特許出願方針",

  demoActions: DEMO_ACTIONS,
  customerProfiles: DEMO_CUSTOMER_PROFILES,
  defaultEvaluationPointRows: DEFAULT_EVALUATION_POINT_ROWS,
  pastCases: DUMMY_PAST_CASES,

  knowledgeTransferQuestions: [
    {
      id: "startupFrequency",
      title: "1. 技術独自性",
      question: "対象技術の独自性はどの程度ですか？",
      intent: "独自性が高い場合は単独出願で競争優位を確保、低い場合は共同出願で技術共創を図ることが有効です",
      options: [
        { value: "high", label: "高い", description: "競合にない独自技術" },
        { value: "medium", label: "中程度", description: "一部に独自要素あり" },
        { value: "low", label: "低い", description: "類似技術が存在" },
      ],
    },
    {
      id: "recoveryTimeTarget",
      title: "2. 事業化時期",
      question: "製品化・事業化の目標時期はいつですか？",
      intent: "事業化が近い場合は早期の権利化が重要、遠い場合は基礎研究との連携を優先できます",
      options: [
        { value: "strict", label: "1年以内", description: "早期事業化" },
        { value: "moderate", label: "2〜3年", description: "標準的" },
        { value: "flexible", label: "3年以上", description: "長期研究" },
      ],
    },
    {
      id: "spaceConstraint",
      title: "3. 海外展開",
      question: "海外市場への展開予定はありますか？",
      intent: "海外展開がある場合、出願国の選定と優先順位が重要になります",
      options: [
        { value: "tight", label: "主要国優先", description: "米欧中を優先" },
        { value: "standard", label: "段階的", description: "市場に応じて追加" },
        { value: "ample", label: "国内中心", description: "当面は国内のみ" },
      ],
    },
  ],

  createConditions: createDummyConditions,
  createAllConditions: createAllAvailableConditions,

  sampleMeetingMinutesSet: [
    {
      id: "ip_meeting_minutes",
      title: SAMPLE_DATA_DESCRIPTIONS.SAMPLE_MEETING_MINUTES.title,
      description: SAMPLE_DATA_DESCRIPTIONS.SAMPLE_MEETING_MINUTES.description,
      data: SAMPLE_MEETING_MINUTES,
    },
    {
      id: "ip_critical_decisions",
      title: SAMPLE_DATA_DESCRIPTIONS.SAMPLE_CRITICAL_DECISIONS.title,
      description: SAMPLE_DATA_DESCRIPTIONS.SAMPLE_CRITICAL_DECISIONS.description,
      data: SAMPLE_CRITICAL_DECISIONS,
    },
    {
      id: "ip_ambiguous_decisions",
      title: SAMPLE_DATA_DESCRIPTIONS.SAMPLE_AMBIGUOUS_DECISIONS.title,
      description: SAMPLE_DATA_DESCRIPTIONS.SAMPLE_AMBIGUOUS_DECISIONS.description,
      data: SAMPLE_AMBIGUOUS_DECISIONS,
    },
  ],

  sampleKnowledgeSet: [
    {
      id: "ip_trouble_report_complete",
      title: SAMPLE_KNOWLEDGE_DESCRIPTIONS.SAMPLE_TROUBLE_REPORT_COMPLETE.title,
      description: SAMPLE_KNOWLEDGE_DESCRIPTIONS.SAMPLE_TROUBLE_REPORT_COMPLETE.description,
      data: SAMPLE_TROUBLE_REPORT_COMPLETE,
    },
    {
      id: "ip_trouble_report_incomplete",
      title: SAMPLE_KNOWLEDGE_DESCRIPTIONS.SAMPLE_TROUBLE_REPORT_INCOMPLETE.title,
      description: SAMPLE_KNOWLEDGE_DESCRIPTIONS.SAMPLE_TROUBLE_REPORT_INCOMPLETE.description,
      data: SAMPLE_TROUBLE_REPORT_INCOMPLETE,
    },
    {
      id: "ip_investigation_memo",
      title: SAMPLE_KNOWLEDGE_DESCRIPTIONS.SAMPLE_INVESTIGATION_MEMO.title,
      description: SAMPLE_KNOWLEDGE_DESCRIPTIONS.SAMPLE_INVESTIGATION_MEMO.description,
      data: SAMPLE_INVESTIGATION_MEMO,
    },
  ],

  similarCases: DEMO_SIMILAR_CASES,
};
