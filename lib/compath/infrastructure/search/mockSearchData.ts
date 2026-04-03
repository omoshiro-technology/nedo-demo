/**
 * モック検索クライアント用データ
 *
 * MockSearchClient.ts から分離したデモ用サンプルデータ
 */

import type {
  SimilarCase,
  DecisionPatternType,
  DecisionStatus,
} from "../../domain/types";

/** デモ用サンプルデータ（建設プロジェクトの意思決定事例） */
export const MOCK_DECISIONS: Array<
  Omit<SimilarCase, "similarity"> & { baseSimilarity: number }
> = [
  {
    id: "mock-1",
    content: "追加予算500万円を承認し、外注増員で対応",
    baseSimilarity: 75,
    patternType: "decision" as DecisionPatternType,
    status: "confirmed" as DecisionStatus,
    sourceFileName: "2024-03-15_月次報告書.pdf",
    decisionDate: "2024-03-15",
    adoptedConclusion: "工期短縮のため外注を増員",
    perspectives: ["予算", "スケジュール"],
  },
  {
    id: "mock-2",
    content: "工期を2週間延長し、品質を優先",
    baseSimilarity: 70,
    patternType: "change" as DecisionPatternType,
    status: "confirmed" as DecisionStatus,
    sourceFileName: "2024-02-28_品質会議議事録.docx",
    decisionDate: "2024-02-28",
    adoptedConclusion: "品質基準を満たすため工期延長を選択",
    perspectives: ["品質", "スケジュール"],
  },
  {
    id: "mock-3",
    content: "設計変更により追加費用300万円が発生、発注者と協議",
    baseSimilarity: 65,
    patternType: "change" as DecisionPatternType,
    status: "gray" as DecisionStatus,
    sourceFileName: "2024-01-20_設計変更報告.pdf",
    decisionDate: "2024-01-20",
    adoptedConclusion: "発注者との協議で費用分担を決定予定",
    perspectives: ["予算", "契約"],
  },
  {
    id: "mock-4",
    content: "資材調達の遅延に対し代替サプライヤーを採用",
    baseSimilarity: 60,
    patternType: "adoption" as DecisionPatternType,
    status: "confirmed" as DecisionStatus,
    sourceFileName: "2024-02-10_調達会議記録.pdf",
    decisionDate: "2024-02-10",
    adoptedConclusion: "B社から調達に切り替え、納期を2週間短縮",
    perspectives: ["調達", "スケジュール"],
  },
  {
    id: "mock-5",
    content: "安全基準強化のため追加検査を実施",
    baseSimilarity: 55,
    patternType: "decision" as DecisionPatternType,
    status: "confirmed" as DecisionStatus,
    sourceFileName: "2024-03-01_安全パトロール報告.pdf",
    decisionDate: "2024-03-01",
    adoptedConclusion: "全工区で追加検査を実施、問題なし確認",
    perspectives: ["安全", "品質"],
  },
  {
    id: "mock-6",
    content: "天候不良による作業中断、予備日を消化",
    baseSimilarity: 50,
    patternType: "change" as DecisionPatternType,
    status: "confirmed" as DecisionStatus,
    sourceFileName: "2024-02-20_日報.pdf",
    decisionDate: "2024-02-20",
    adoptedConclusion: "予備日3日を消化し、工程を維持",
    perspectives: ["スケジュール"],
  },
  {
    id: "mock-7",
    content: "近隣住民からの騒音クレームに対し作業時間を変更",
    baseSimilarity: 45,
    patternType: "change" as DecisionPatternType,
    status: "confirmed" as DecisionStatus,
    sourceFileName: "2024-01-15_クレーム対応記録.pdf",
    decisionDate: "2024-01-15",
    adoptedConclusion: "作業時間を9:00-17:00に短縮、週末作業を中止",
    perspectives: ["安全", "契約"],
  },
];

/** キーワードと関連カテゴリのマッピング */
export const KEYWORD_CATEGORY_MAP: Record<string, string[]> = {
  工期: ["スケジュール"],
  遅れ: ["スケジュール"],
  遅延: ["スケジュール"],
  納期: ["スケジュール"],
  コスト: ["予算"],
  予算: ["予算"],
  費用: ["予算"],
  追加: ["予算", "スケジュール"],
  品質: ["品質"],
  検査: ["品質", "安全"],
  変更: ["契約"],
  設計: ["品質"],
  調達: ["調達"],
  資材: ["調達"],
  安全: ["安全"],
  クレーム: ["安全", "契約"],
};
