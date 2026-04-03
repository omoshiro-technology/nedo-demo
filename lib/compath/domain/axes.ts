import type { AxisDefinition } from "./types";

export const AXIS_DEFINITIONS: AxisDefinition[] = [
  {
    id: "defect-cause-countermeasure-case",
    label: "不具合起点",
    levels: [
      { id: "defect", label: "不具合" },
      { id: "cause", label: "原因" },
      { id: "countermeasure", label: "対策" },
      { id: "case", label: "事例" }
    ]
  },
  {
    id: "past-trouble-deep-analysis",
    label: "過去トラ深堀分析",
    levels: [
      { id: "phenomenon", label: "現象", guide: "具体的に何が起きたか（数値・日時・場所を含む具体的事実）" },
      { id: "root-cause", label: "根本原因", guide: "なぜ現象が発生したのか（5WHY分析による真因）" },
      { id: "direct-cause", label: "直接原因", guide: "現象を直接引き起こした要因" },
      { id: "background", label: "背景要因", guide: "問題を助長した組織的・環境的要因" },
      { id: "immediate-action", label: "応急対策", guide: "発生直後に実施した緊急対応" },
      { id: "permanent-action", label: "恒久対策", guide: "再発防止のための根本的対策" },
      { id: "horizontal-deployment", label: "横展開", guide: "類似箇所・他製品への展開施策" },
      { id: "verification", label: "効果検証", guide: "対策の有効性確認方法・結果" }
    ]
  },
  {
    id: "product-component-material-function-feature",
    label: "製品構成",
    levels: [
      { id: "product", label: "品名" },
      { id: "component", label: "コンポーネント" },
      { id: "material", label: "素材" },
      { id: "function", label: "機能" },
      { id: "feature", label: "特徴" }
    ]
  }
];
