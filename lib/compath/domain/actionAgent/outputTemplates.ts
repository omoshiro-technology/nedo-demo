/**
 * コピーレディ出力テンプレート
 *
 * AIの出力を「そのまま業務で使える」形式にするためのテンプレート定義
 */

/** プレースホルダー定義 */
export type Placeholder = {
  /** プレースホルダーキー（テンプレート内で{{key}}として使用） */
  key: string;
  /** 表示ラベル */
  label: string;
  /** 必須かどうか */
  required: boolean;
  /** デフォルト値 */
  defaultValue?: string;
  /** 入力タイプ */
  inputType?: "text" | "textarea" | "date" | "email" | "select";
  /** 選択肢（inputType: "select"の場合） */
  options?: string[];
};

/** 出力カテゴリ */
export type OutputCategory =
  | "email"           // メール文面
  | "meeting_agenda"  // 会議アジェンダ
  | "meeting_minutes" // 議事録
  | "report"          // 報告書
  | "checklist"       // チェックリスト
  | "proposal"        // 提案書
  | "decision_record" // 意思決定記録
  | "action_plan";    // アクションプラン

/** 出力フォーマット */
export type OutputFormat = "markdown" | "plain" | "html" | "csv";

/** コピーレディ出力のテンプレート */
export type OutputTemplate = {
  /** テンプレートID */
  id: string;
  /** テンプレート名 */
  name: string;
  /** カテゴリ */
  category: OutputCategory;
  /** 出力フォーマット */
  format: OutputFormat;
  /** テンプレート本文（{{key}}でプレースホルダーを指定） */
  template: string;
  /** プレースホルダー一覧 */
  placeholders: Placeholder[];
  /** 使用例（ユーザーへの説明用） */
  example: string;
  /** 説明 */
  description: string;
  /** アイコン（絵文字） */
  icon: string;
};

/** テンプレートの出力結果 */
export type GeneratedOutput = {
  /** 使用したテンプレートID */
  templateId: string;
  /** テンプレート名 */
  templateName: string;
  /** 生成された出力 */
  output: string;
  /** 出力フォーマット */
  format: OutputFormat;
  /** 充填されたプレースホルダー */
  filledPlaceholders: Record<string, string>;
  /** 未充填のプレースホルダー（ユーザー入力が必要） */
  missingPlaceholders: string[];
  /** 生成日時 */
  generatedAt: string;
};

/**
 * 製造業向け出力テンプレート集
 */
export const MANUFACTURING_TEMPLATES: OutputTemplate[] = [
  // ==================== メール系 ====================
  {
    id: "design_review_email",
    name: "設計レビュー依頼メール",
    category: "email",
    format: "plain",
    icon: "📧",
    description: "設計レビューを依頼するメールを作成します",
    template: `件名: 【設計レビュー依頼】{{project_name}} - {{review_target}}

{{recipient_name}} 様

お疲れ様です。{{sender_name}}です。

下記の設計レビューをお願いいたします。

■ レビュー対象
・プロジェクト: {{project_name}}
・対象: {{review_target}}
・資料: {{document_link}}

■ レビュー観点
{{review_points}}

■ 希望期限: {{deadline}}

ご確認のほど、よろしくお願いいたします。

{{sender_name}}`,
    placeholders: [
      { key: "recipient_name", label: "宛先（様）", required: true },
      { key: "sender_name", label: "送信者名", required: true },
      { key: "project_name", label: "プロジェクト名", required: true },
      { key: "review_target", label: "レビュー対象", required: true },
      { key: "document_link", label: "資料リンク", required: false, defaultValue: "（添付参照）" },
      { key: "review_points", label: "レビュー観点", required: true, inputType: "textarea" },
      { key: "deadline", label: "希望期限", required: true, inputType: "date" },
    ],
    example: "設計図面や仕様書のレビューを依頼する際に使用します",
  },
  {
    id: "meeting_invitation_email",
    name: "会議招集メール",
    category: "email",
    format: "plain",
    icon: "📅",
    description: "会議への参加を依頼するメールを作成します",
    template: `件名: 【会議招集】{{meeting_title}} ({{meeting_date}})

関係者各位

お疲れ様です。{{organizer_name}}です。

下記の通り会議を開催いたします。ご参加をお願いいたします。

■ 会議概要
・件名: {{meeting_title}}
・日時: {{meeting_date}} {{meeting_time}}
・場所: {{location}}
・所要時間: {{duration}}

■ アジェンダ
{{agenda}}

■ 準備事項
{{preparation}}

ご参加のほど、よろしくお願いいたします。

{{organizer_name}}`,
    placeholders: [
      { key: "organizer_name", label: "主催者名", required: true },
      { key: "meeting_title", label: "会議タイトル", required: true },
      { key: "meeting_date", label: "開催日", required: true, inputType: "date" },
      { key: "meeting_time", label: "開始時刻", required: true },
      { key: "location", label: "場所", required: true },
      { key: "duration", label: "所要時間", required: false, defaultValue: "1時間" },
      { key: "agenda", label: "アジェンダ", required: true, inputType: "textarea" },
      { key: "preparation", label: "準備事項", required: false, inputType: "textarea", defaultValue: "特になし" },
    ],
    example: "設計レビュー会議やプロジェクト進捗会議の招集に使用します",
  },
  {
    id: "status_report_email",
    name: "進捗報告メール",
    category: "email",
    format: "plain",
    icon: "📊",
    description: "プロジェクトの進捗状況を報告するメールを作成します",
    template: `件名: 【進捗報告】{{project_name}} ({{report_date}})

{{recipient_name}} 様

お疲れ様です。{{sender_name}}です。

{{project_name}}の進捗をご報告いたします。

■ 全体進捗: {{overall_progress}}

■ 今週の実績
{{achievements}}

■ 来週の予定
{{next_plans}}

■ 課題・懸念事項
{{issues}}

■ 相談事項
{{consultations}}

以上、ご確認のほどよろしくお願いいたします。

{{sender_name}}`,
    placeholders: [
      { key: "recipient_name", label: "宛先（様）", required: true },
      { key: "sender_name", label: "送信者名", required: true },
      { key: "project_name", label: "プロジェクト名", required: true },
      { key: "report_date", label: "報告日", required: true, inputType: "date" },
      { key: "overall_progress", label: "全体進捗", required: true },
      { key: "achievements", label: "今週の実績", required: true, inputType: "textarea" },
      { key: "next_plans", label: "来週の予定", required: true, inputType: "textarea" },
      { key: "issues", label: "課題・懸念事項", required: false, inputType: "textarea", defaultValue: "特になし" },
      { key: "consultations", label: "相談事項", required: false, inputType: "textarea", defaultValue: "特になし" },
    ],
    example: "週次・月次の進捗報告に使用します",
  },

  // ==================== 議事録系 ====================
  {
    id: "meeting_minutes",
    name: "会議議事録",
    category: "meeting_minutes",
    format: "markdown",
    icon: "📝",
    description: "会議の議事録を作成します",
    template: `# 議事録: {{meeting_title}}

## 基本情報
- **日時**: {{meeting_date}} {{meeting_time}}
- **場所**: {{location}}
- **参加者**: {{attendees}}
- **記録者**: {{recorder}}

---

## アジェンダ
{{agenda}}

---

## 議事内容

{{discussion}}

---

## 決定事項

{{decisions}}

---

## アクションアイテム

| 担当者 | タスク | 期限 |
|--------|--------|------|
{{action_items}}

---

## 次回予定
- **日時**: {{next_meeting}}
- **議題**: {{next_agenda}}

---

以上`,
    placeholders: [
      { key: "meeting_title", label: "会議タイトル", required: true },
      { key: "meeting_date", label: "開催日", required: true, inputType: "date" },
      { key: "meeting_time", label: "開始時刻", required: true },
      { key: "location", label: "場所", required: true },
      { key: "attendees", label: "参加者", required: true },
      { key: "recorder", label: "記録者", required: true },
      { key: "agenda", label: "アジェンダ", required: true, inputType: "textarea" },
      { key: "discussion", label: "議事内容", required: true, inputType: "textarea" },
      { key: "decisions", label: "決定事項", required: true, inputType: "textarea" },
      { key: "action_items", label: "アクションアイテム", required: false, inputType: "textarea" },
      { key: "next_meeting", label: "次回日時", required: false },
      { key: "next_agenda", label: "次回議題", required: false },
    ],
    example: "設計レビュー、プロジェクト会議などの議事録に使用します",
  },

  // ==================== チェックリスト系 ====================
  {
    id: "design_review_checklist",
    name: "設計レビューチェックリスト",
    category: "checklist",
    format: "markdown",
    icon: "✅",
    description: "設計レビュー時のチェック項目を作成します",
    template: `# 設計レビューチェックリスト

## 対象: {{review_target}}
## レビュー日: {{review_date}}
## レビュアー: {{reviewer}}

---

### 1. 要件適合性
- [ ] 顧客要求を満たしているか
- [ ] 機能仕様と整合しているか
- [ ] 制約条件を考慮しているか

### 2. 品質（Quality）
- [ ] 品質基準を満たしているか
- [ ] 検査方法が明確か
- [ ] トレーサビリティが確保されているか

### 3. コスト（Cost）
- [ ] 目標コスト内か
- [ ] コスト削減の余地はあるか
- [ ] 調達リスクはないか

### 4. 納期（Delivery）
- [ ] スケジュールに問題はないか
- [ ] リードタイムは適切か
- [ ] 依存関係は明確か

### 5. 安全性（Safety）
- [ ] 安全基準を満たしているか
- [ ] リスクアセスメントは完了しているか
- [ ] 緊急時の対応は考慮されているか

### 6. 環境（Environment）
- [ ] 環境規制に適合しているか
- [ ] 持続可能性は考慮されているか

---

### 追加確認事項
{{additional_checks}}

---

### 総合判定
- [ ] 承認
- [ ] 条件付き承認
- [ ] 再レビュー要

### コメント
{{comments}}`,
    placeholders: [
      { key: "review_target", label: "レビュー対象", required: true },
      { key: "review_date", label: "レビュー日", required: true, inputType: "date" },
      { key: "reviewer", label: "レビュアー", required: true },
      { key: "additional_checks", label: "追加確認事項", required: false, inputType: "textarea" },
      { key: "comments", label: "コメント", required: false, inputType: "textarea" },
    ],
    example: "設計レビュー時のチェックリストとして使用します（QCDES観点を網羅）",
  },

  // ==================== 意思決定記録系 ====================
  {
    id: "decision_record",
    name: "意思決定記録",
    category: "decision_record",
    format: "markdown",
    icon: "⚖️",
    description: "重要な意思決定の内容と理由を記録します",
    template: `# 意思決定記録

## 基本情報
- **件名**: {{decision_title}}
- **決定日**: {{decision_date}}
- **決定者**: {{decision_maker}}
- **関係者**: {{stakeholders}}

---

## 背景・目的
{{background}}

---

## 検討した選択肢

### 選択肢A: {{option_a_name}}
- **概要**: {{option_a_description}}
- **メリット**: {{option_a_pros}}
- **デメリット**: {{option_a_cons}}

### 選択肢B: {{option_b_name}}
- **概要**: {{option_b_description}}
- **メリット**: {{option_b_pros}}
- **デメリット**: {{option_b_cons}}

{{additional_options}}

---

## 決定内容
**採用した選択肢**: {{selected_option}}

---

## 決定理由
{{decision_rationale}}

---

## リスクと対策
{{risks_and_mitigations}}

---

## 今後のアクション
{{next_actions}}

---

## 備考
{{notes}}`,
    placeholders: [
      { key: "decision_title", label: "件名", required: true },
      { key: "decision_date", label: "決定日", required: true, inputType: "date" },
      { key: "decision_maker", label: "決定者", required: true },
      { key: "stakeholders", label: "関係者", required: false },
      { key: "background", label: "背景・目的", required: true, inputType: "textarea" },
      { key: "option_a_name", label: "選択肢A名", required: true },
      { key: "option_a_description", label: "選択肢A概要", required: true, inputType: "textarea" },
      { key: "option_a_pros", label: "選択肢Aメリット", required: false, inputType: "textarea" },
      { key: "option_a_cons", label: "選択肢Aデメリット", required: false, inputType: "textarea" },
      { key: "option_b_name", label: "選択肢B名", required: true },
      { key: "option_b_description", label: "選択肢B概要", required: true, inputType: "textarea" },
      { key: "option_b_pros", label: "選択肢Bメリット", required: false, inputType: "textarea" },
      { key: "option_b_cons", label: "選択肢Bデメリット", required: false, inputType: "textarea" },
      { key: "additional_options", label: "追加選択肢", required: false, inputType: "textarea" },
      { key: "selected_option", label: "採用した選択肢", required: true },
      { key: "decision_rationale", label: "決定理由", required: true, inputType: "textarea" },
      { key: "risks_and_mitigations", label: "リスクと対策", required: false, inputType: "textarea" },
      { key: "next_actions", label: "今後のアクション", required: false, inputType: "textarea" },
      { key: "notes", label: "備考", required: false, inputType: "textarea" },
    ],
    example: "重要な技術選定や方針決定を記録・共有する際に使用します",
  },

  // ==================== アクションプラン系 ====================
  {
    id: "action_plan",
    name: "アクションプラン",
    category: "action_plan",
    format: "markdown",
    icon: "📋",
    description: "具体的なアクションプランを作成します",
    template: `# アクションプラン

## 概要
- **目的**: {{objective}}
- **期間**: {{start_date}} 〜 {{end_date}}
- **責任者**: {{owner}}

---

## 目標
{{goals}}

---

## アクション一覧

| # | タスク | 担当 | 期限 | ステータス |
|---|--------|------|------|------------|
{{tasks}}

---

## マイルストーン

| マイルストーン | 期日 | 完了条件 |
|---------------|------|----------|
{{milestones}}

---

## リソース・予算
{{resources}}

---

## リスクと対策
{{risks}}

---

## 成功基準
{{success_criteria}}

---

## 次のレビュー日: {{next_review_date}}`,
    placeholders: [
      { key: "objective", label: "目的", required: true },
      { key: "start_date", label: "開始日", required: true, inputType: "date" },
      { key: "end_date", label: "終了日", required: true, inputType: "date" },
      { key: "owner", label: "責任者", required: true },
      { key: "goals", label: "目標", required: true, inputType: "textarea" },
      { key: "tasks", label: "タスク一覧", required: true, inputType: "textarea" },
      { key: "milestones", label: "マイルストーン", required: false, inputType: "textarea" },
      { key: "resources", label: "リソース・予算", required: false, inputType: "textarea" },
      { key: "risks", label: "リスクと対策", required: false, inputType: "textarea" },
      { key: "success_criteria", label: "成功基準", required: true, inputType: "textarea" },
      { key: "next_review_date", label: "次回レビュー日", required: false, inputType: "date" },
    ],
    example: "プロジェクト立ち上げや改善活動のアクションプラン作成に使用します",
  },

  // ==================== 提案書系（Phase 28） ====================
  {
    id: "sales_proposal_stability",
    name: "安定運転提案書",
    category: "proposal",
    format: "markdown",
    icon: "📋",
    description: "継続受注向けの安定運転重視提案書を作成します",
    template: `# {{customer_name}} 様 ご提案書

## 1. 背景

{{background}}

---

## 2. 課題の再定義

{{problem_redefinition}}

---

## 3. 判断論点

{{evaluation_points}}

---

## 4. 選択肢のご提案

### 案A: {{option_a_name}}（最小構成）

{{option_a_description}}

**メリット:**
{{option_a_pros}}

**デメリット:**
{{option_a_cons}}

---

### 案B: {{option_b_name}}（推奨）

{{option_b_description}}

**メリット:**
{{option_b_pros}}

**デメリット:**
{{option_b_cons}}

---

### 案C: {{option_c_name}}（段階導入）

{{option_c_description}}

**メリット:**
{{option_c_pros}}

**デメリット:**
{{option_c_cons}}

---

## 5. 推奨案と理由

{{recommendation}}

---

## 6. リスクの正直な開示

{{risks}}

---

## 7. ご判断いただきたい点

{{customer_decision_point}}

---

作成日: {{created_date}}
`,
    placeholders: [
      { key: "customer_name", label: "顧客名", required: true },
      { key: "background", label: "背景", required: true, inputType: "textarea" },
      { key: "problem_redefinition", label: "課題の再定義", required: true, inputType: "textarea" },
      { key: "evaluation_points", label: "判断論点", required: true, inputType: "textarea" },
      { key: "option_a_name", label: "案Aの名称", required: true },
      { key: "option_a_description", label: "案Aの説明", required: true, inputType: "textarea" },
      { key: "option_a_pros", label: "案Aのメリット", required: true, inputType: "textarea" },
      { key: "option_a_cons", label: "案Aのデメリット", required: true, inputType: "textarea" },
      { key: "option_b_name", label: "案Bの名称（推奨）", required: true },
      { key: "option_b_description", label: "案Bの説明", required: true, inputType: "textarea" },
      { key: "option_b_pros", label: "案Bのメリット", required: true, inputType: "textarea" },
      { key: "option_b_cons", label: "案Bのデメリット", required: true, inputType: "textarea" },
      { key: "option_c_name", label: "案Cの名称", required: true },
      { key: "option_c_description", label: "案Cの説明", required: true, inputType: "textarea" },
      { key: "option_c_pros", label: "案Cのメリット", required: true, inputType: "textarea" },
      { key: "option_c_cons", label: "案Cのデメリット", required: true, inputType: "textarea" },
      { key: "recommendation", label: "推奨案と理由", required: true, inputType: "textarea" },
      { key: "risks", label: "リスクの正直な開示", required: true, inputType: "textarea" },
      { key: "customer_decision_point", label: "ご判断いただきたい点", required: true, inputType: "textarea" },
      { key: "created_date", label: "作成日", required: true, inputType: "date" },
    ],
    example: "継続受注のための安定運転重視提案書に使用します。原子力等の高信頼性現場で培った判断構造を活用し、顧客価値に沿った提案を行います。",
  },
];

/**
 * テンプレートをIDで検索
 */
export function findTemplateById(id: string): OutputTemplate | undefined {
  return MANUFACTURING_TEMPLATES.find((t) => t.id === id);
}

/**
 * カテゴリでテンプレートを検索
 */
export function findTemplatesByCategory(category: OutputCategory): OutputTemplate[] {
  return MANUFACTURING_TEMPLATES.filter((t) => t.category === category);
}

/**
 * テンプレート一覧を取得（UI表示用）
 */
export function getTemplateList(): Array<{
  id: string;
  name: string;
  category: OutputCategory;
  icon: string;
  description: string;
}> {
  return MANUFACTURING_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    icon: t.icon,
    description: t.description,
  }));
}
