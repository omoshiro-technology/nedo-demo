/**
 * 意思決定タイムライン分析機能のテスト用サンプルデータ
 * オムロン技術・知財本部向けデモシナリオ
 *
 * シナリオ設定:
 * - 技術・知財本部での新技術の知財戦略会議
 * - センシング×AI技術の特許出願方針決定
 * - 研究開発と知財戦略の一体的推進
 */

export const SAMPLE_MEETING_MINUTES = `
【センシング×AI技術 知財戦略会議 議事録】
日時：2024年10月15日（火）10:00〜11:30
場所：技術・知財本部 第3会議室
出席者：技術戦略部 田中部長、知財戦略課 鈴木課長、
        センシング研究G 山田主任、AI研究G 佐藤、外部連携 高橋

■ 議題1：新規センシング×AI技術の知財戦略

田中部長より、次世代画像センシング技術とAI推論エンジンの統合技術について説明があった。

鈴木課長から「本技術は当社の中核技術になり得るため、知財戦略を早期に固める必要がある」との意見があり、特許出願の優先度について議論した。

協議の結果、コアアルゴリズム部分を最優先とし、2025年3月末までに基本特許20件の出願を完了する方針で合意した。

予算については、知財出願費用として3000万円、外部との共同研究費として2000万円の計5000万円を上限とすることで合意した。

■ 議題2：オープンイノベーション戦略

大学・研究機関との共同研究について協議した。

高橋より「東京大学との画像認識基盤技術の共同研究は継続の方向で検討中。ただし、知財条件について先方と合意が得られ次第、正式決定の予定」との報告があった。

大阪大学との推論エンジン共同研究については、「先方の予算確保が前提となるため、現時点では見込みベースで進めている」との補足があった。

鈴木課長から「基盤技術は共有、応用技術は単独という整理でよいか」との確認があったが、結論は出ず。法務と調整した上で改めて協議することになった。

論文発表については、佐藤から「学会発表のタイミングを逃したくない」との意見があったが、田中部長から「特許出願後でないと新規性を失うリスクがある」との指摘があり、出願後に限定する方針とした。

■ 議題3：事業部門との連携

FA事業部から技術移管の要請が来ているとの報告があった。

山田主任から「技術移管は2025年度後半を目処に開始する方向で検討中。ただし、事業部側の受け入れ体制が整い次第、具体的なスケジュールを確定する予定」との説明があった。

技術移管にあたっては、ノウハウやデータ資産も含めて無形資産として整理することが重要との意見があった。管理体制については、どこまでを対象とするか、誰が管理するかなど、具体的な議論は次回以降に持ち越しとなった。

■ 議題4：リスク対応と海外展開

鈴木課長から競合他社の特許出願動向について報告があった。先行技術調査の強化が必要との認識で一致し、追加で500万円の調査予算を計上することで合意した。

海外出願については、米国・欧州・中国の主要3カ国を優先する方針で進める見込み。ただし、各国の審査動向や事業計画との整合を確認してから最終判断とする。

高橋から「東南アジア市場への展開も視野に入れるべきではないか」との提案があった。来期の事業計画策定時に改めて検討することとなった。

■ その他

鈴木課長から標準化活動への参加について提案があった。「業界標準に関与することで技術の影響力を高められるのではないか」とのことだが、参加の是非については次回以降の議題とする。

山田主任から「技術移管後の保守体制についても早めに検討すべきではないか」との意見が出た。これについては継続課題とする。

次回：2024年10月29日（火）14:00〜
`;

/**
 * 重要度・フェーズ遅延・変更トラッキングのテスト用サンプル
 */
export const SAMPLE_CRITICAL_DECISIONS = `
【緊急知財対応会議 議事録】
日時：2024年11月20日（水）
出席者：知財戦略部長、技術戦略部長、法務課長

■ 競合特許への対応

競合A社の新規特許出願が発見され、当社技術との抵触可能性を確認。
対応方針として、先使用権の主張準備を進めることで合意した。

予算超過が見込まれるため、追加費用800万円の承認を申請する。
法務部門との連携を強化し、週次で状況確認を行うこととする。

技術的な差別化ポイントを明確化するため、
追加の技術文書を作成することを決定した。

出願計画をRev.AからRev.Bに変更する。
主な変更点：優先出願分野の見直し、請求項の拡充

研究開発スケジュールの見直しを行い、
知財調査頻度を月次から週次に変更することで合意。

開発人員を2名から4名に増員することとする。
外部専門家との連携を強化し、月1回のレビュー会議を実施する。

以上
`;

/**
 * グレー判定（曖昧な決定）のテスト用サンプル
 * ラフな書き方、曖昧表現、未確定事項を多く含む
 */
export const SAMPLE_AMBIGUOUS_DECISIONS = `
【新規研究テーマ検討 ブレストメモ】
日時：2024年12月1日
場所：技術センター 会議室A
参加：センシング研究G 山本、AI研究G 木村、事業企画 中島

---

とりあえず話した内容まとめ

■ 新規研究テーマについて

・カーボンニュートラル向けセンシング技術の検討を開始予定
・予算はたぶん2000万くらい？要確認
・技術的にできるかどうか、まだ調査中

木村さんから「社会課題起点で早く動きたい」とのこと
→ただ、リソース的にきついかも。要相談

■ 知財戦略の話

出願方針の見直しが必要かも。詳細未定
競合動向次第で優先度変えるかも

標準化活動への参加はA案とB案で迷ってる
・A案：積極参加で影響力確保
・B案：様子見でリソース温存
→どっちにするか引き続き協議が必要

中島さん曰く「事業部としてはA案のほうがやりやすい」
でも研究所的にはB案推しらしい

■ スケジュール関連

研究完了は2025年度末を目標としているが、正式には未定
調整中なので確定してない

開発着手は来期からの予定
ただし、人員確保できるかどうか不透明

実証実験期間を3ヶ月とする方向だが、もっと必要かも？
社会実装のためには6ヶ月は欲しいという意見も

■ 予算・コスト

追加予算が必要になる見込み
金額は精査中。たぶん500〜800万くらい？

外部研究機関との共同研究も検討中
コスト次第では内製に切り替えるかもしれない

■ 品質について

技術の成熟度を厳格に評価する方向で検討してる
ただ事業化スピードとのバランス見ながら最終決定する予定

論文採択率向上を目指すことになりそう
→ただし、これは仮の数字

オープンイノベーション活動を拡大予定
時期は未定だが、できれば今期中に1件は成果出したい

■ 体制の話

プロジェクトリーダーは佐藤さんになる可能性が高い
ただ、まだ正式には決まってない

研究メンバーは6名体制を想定
→人が足りなければ中途採用も検討

■ その他

次回会議で最終判断を行う予定
ただし関係部門の承認が必要なため遅れる可能性も

来週までに各自で検討事項を洗い出しておく
→誰が何をやるかは特に決めてない

事業部への報告は月末予定
内容はまだ固まってないので、追って連絡

---

TODO（たぶん）
・予算の精査
・A案B案の比較資料作成
・スケジュール案の作成
・リソース確認

次回：12月8日（月）14時〜 ※仮


【技術移管検討 打ち合わせメモ】
日時：2024年12月5日
参加：技術戦略 渡辺、FA事業部 中島、研究G 山本

ざっくりメモ

■ 現状の課題

・事業部からの技術移管要請が増えてる気がする
・研究所のリソースが逼迫してるかも？
・優先度の基準がまだ明確でない

■ 対策案

1. 技術移管プロセスを標準化することを検討
   →工数との兼ね合いで要検討

2. 評価基準を見直す予定
   →いつやるかは未定

3. 事業部との定例会議を強化する方向
   →予算取れるかどうか確認中

■ 方針

当面は個別対応しつつ、データ収集することとする
→ただ、急ぎの対応が必要になるかもしれない

週次でレビュー会議やる予定
→日程は調整中

技術移管件数は現状維持を基本とする
→ただし、状況次第で増やすかも

■ 今後

来月のデータを見て判断することになりそう
それまでは現行フロー継続

以上


【外部連携先選定 打ち合わせメモ】
日時：2024年12月10日
参加：外部連携 高橋、研究戦略 鈴木

■ 候補研究機関

・X大学：実績あり、競争率高い
・Y研究所：コスパ良いけど対応遅いらしい
・Z機構：新規、評判は悪くない

どこと組むかはまだ決まってない
提案書揃ってから検討予定

■ 選定基準

技術力重視か実績重視か、方針が定まってない
本部長に確認が必要

共同研究のテーマ適合性も見たほうがいいかも？
→評価項目に入れることを検討中

■ スケジュール

今月中に絞り込みたい
→ただし、年末なので難しいかも

正式契約は来年1月以降になる見込み
予算確定待ち

■ その他懸念

知財の取り扱い条件の交渉が必要になりそう
法務確認がまだ

秘密保持契約の内容も確認しないといけない
→チェックリストを作成予定

とりあえず今日はここまで
続きは来週

---

※このメモは個人用のラフなものです
正式な議事録は別途作成予定
`;


export const SAMPLE_DATA_DESCRIPTIONS = {
  SAMPLE_MEETING_MINUTES: {
    title: "センシング×AI技術 知財戦略会議",
    description: "技術・知財本部での知財戦略会議議事録。特許出願・共同研究・事業連携など様々な決定を含む。",
    features: ["複数日付", "重要度検出", "フェーズ遅延", "変更トラッキング"],
  },
  SAMPLE_CRITICAL_DECISIONS: {
    title: "緊急知財対応会議",
    description: "競合特許への緊急対応を含むサンプル。予算・知財・体制に関するキーワードを含む。",
    features: ["高重要度", "緊急対応", "変更詳細"],
  },
  SAMPLE_AMBIGUOUS_DECISIONS: {
    title: "研究テーマ検討メモ（3件）",
    description: "ラフな書き方、曖昧表現、未確定事項を多く含むサンプル。グレー判定のテスト用。",
    features: ["グレー判定", "曖昧表現", "提案段階", "ラフな記述"],
  },
};

import type { DecisionTimelineResult } from "../types";

/**
 * 事前定義されたサンプル分析結果
 * sourceTextは原文と完全一致するようにコピー
 */
export const SAMPLE_MEETING_MINUTES_RESULT: DecisionTimelineResult = {
  decisions: [
    // === 確定（confirmed）===
    {
      id: "sample-decision-001",
      content: "基本特許20件を2025年3月末までに出願完了",
      patternType: "decision",
      sourceText: "コアアルゴリズム部分を最優先とし、2025年3月末までに基本特許20件の出願を完了する方針で合意した。",
      sourceFileName: "sample_meeting_minutes.txt",
      decisionDate: "2024-10-15",
      confidence: "high",
      status: "confirmed",
      qualityScore: 0.95,
      importance: { level: "high", categories: ["schedule"], keywords: ["特許", "出願", "完了"] },
      feedforwardActions: [
        {
          id: "ff-001-1",
          action: "特許出願計画書を更新する",
          deadline: "1週間以内",
          priority: "high",
          rationale: "出願期限に基づくマイルストーンを設定するため",
        },
        {
          id: "ff-001-2",
          action: "各研究グループに出願対象技術を確認する",
          deadline: "3日以内",
          priority: "high",
          rationale: "出願対象の洗い出しを早期に完了するため",
        },
      ],
      veteranVoices: [
        {
          quote: "特許出願は数だけでなく、請求項の質が重要。事業戦略と紐づけた出願を心がけること",
          quoteSource: {
            date: "2019年5月",
            meetingName: "知財戦略レビュー会議",
            speakerRole: "知財戦略部 山田部長",
          },
          veteranInsight: "出願数の目標だけを追うと、事業で使えない特許が増えます",
          relevanceScore: 85,
          contextTags: ["知財戦略", "特許出願"],
        },
      ],
    },
    {
      id: "sample-decision-002",
      content: "知財・研究費予算5000万円で合意",
      patternType: "agreement",
      sourceText: "知財出願費用として3000万円、外部との共同研究費として2000万円の計5000万円を上限とすることで合意した。",
      sourceFileName: "sample_meeting_minutes.txt",
      decisionDate: "2024-10-15",
      confidence: "high",
      status: "confirmed",
      qualityScore: 0.95,
      importance: { level: "critical", categories: ["budget"], keywords: ["予算", "万円"] },
      feedforwardActions: [
        {
          id: "ff-002-1",
          action: "予算配分計画を作成する",
          deadline: "2週間以内",
          priority: "high",
          rationale: "知財費用・研究費・外部連携費の配分を明確化するため",
        },
      ],
      veteranVoices: [
        {
          quote: "研究予算を決めたら予備費は必ず15%以上確保しておくこと",
          quoteSource: {
            date: "2018年7月",
            meetingName: "R&D予算計画会議",
            speakerRole: "経理部 高橋課長",
          },
          veteranInsight: "予備費なしで予算を組むと、最後に研究の質にしわ寄せが来ます",
          relevanceScore: 90,
          contextTags: ["予算", "リスク管理"],
        },
      ],
    },
    {
      id: "sample-decision-003",
      content: "論文発表は特許出願後に限定",
      patternType: "agreement",
      sourceText: "出願後に限定する方針とした。",
      sourceFileName: "sample_meeting_minutes.txt",
      decisionDate: "2024-10-15",
      confidence: "high",
      status: "confirmed",
      qualityScore: 0.95,
      importance: { level: "high", categories: ["quality"], keywords: ["知財", "論文"] },
    },
    {
      id: "sample-decision-004",
      content: "先行技術調査費用500万円を追加計上",
      patternType: "agreement",
      sourceText: "追加で500万円の調査費用を計上することで合意した。",
      sourceFileName: "sample_meeting_minutes.txt",
      decisionDate: "2024-10-15",
      confidence: "high",
      status: "confirmed",
      qualityScore: 0.9,
      importance: { level: "high", categories: ["budget"], keywords: ["費用", "計上"] },
    },
    // === 要確認（gray）===
    {
      id: "sample-decision-005",
      content: "大学との共同研究継続（知財条件は法務確認中）",
      patternType: "decision",
      sourceText: "東京大学との画像認識基盤技術、大阪大学との推論エンジンの共同研究は継続したい",
      sourceFileName: "sample_meeting_minutes.txt",
      decisionDate: "2024-10-15",
      confidence: "medium",
      status: "gray",
      qualityScore: 0.75,
      ambiguityFlags: ["知財取り扱い条件の詳細が未確定", "法務との調整が必要"],
      guidance: {
        requiredActions: ["知財取り扱い条件を法務と確認する", "基盤技術と応用技術の線引きを明確化する"],
        missingInfo: ["具体的な知財帰属ルール", "契約条件の詳細"],
      },
      feedforwardActions: [
        {
          id: "ff-005-1",
          action: "法務部門と知財条件を確認する",
          deadline: "2週間以内",
          priority: "high",
          rationale: "後からの帰属トラブルを防ぐため",
        },
      ],
    },
    {
      id: "sample-decision-006",
      content: "FA事業部への技術移管（対象範囲は協議中）",
      patternType: "change",
      sourceText: "2025年度から段階的に移管を開始し、2026年度には製品実装を完了したい",
      sourceFileName: "sample_meeting_minutes.txt",
      decisionDate: "2024-10-15",
      confidence: "medium",
      status: "gray",
      qualityScore: 0.7,
      ambiguityFlags: ["移管対象の技術範囲が未確定", "事業部との詳細協議が必要"],
      guidance: {
        requiredActions: ["移管対象技術を明確化する", "事業部との詳細協議を実施する"],
        missingInfo: ["具体的な移管技術の一覧", "移管スケジュールの詳細"],
      },
      feedforwardActions: [
        {
          id: "ff-006-1",
          action: "移管対象技術を一覧にまとめる",
          deadline: "1週間以内",
          priority: "high",
          rationale: "関係者間で認識を揃えるため",
        },
        {
          id: "ff-006-2",
          action: "事業部との定期協議の場を設定する",
          deadline: "2週間以内",
          priority: "medium",
          rationale: "移管進捗を関係者で共有するため",
        },
      ],
      veteranVoices: [
        {
          quote: "技術移管は早めに計画を詰めること。口頭だけだと後で揉める",
          quoteSource: {
            date: "2020年11月",
            meetingName: "技術移管振り返り会議",
            speakerRole: "技術戦略部 伊藤マネージャー",
          },
          veteranInsight: "移管対象の管理が曖昧だと、後でトラブルになります",
          relevanceScore: 88,
          contextTags: ["技術移管", "事業連携"],
        },
      ],
    },
    {
      id: "sample-decision-007",
      content: "海外出願は主要3カ国優先（アジア市場は継続検討）",
      patternType: "decision",
      sourceText: "当面は主要3カ国を優先しつつ、各国の審査状況を見ながら判断することとした。",
      sourceFileName: "sample_meeting_minutes.txt",
      decisionDate: "2024-10-15",
      confidence: "medium",
      status: "gray",
      qualityScore: 0.75,
      ambiguityFlags: ["アジア市場の出願判断が未確定", "判断基準が不明確"],
      guidance: {
        requiredActions: ["各国の出願スケジュールを策定する", "アジア市場の出願要否を検討する"],
        missingInfo: ["具体的な出願時期", "追加国への拡大基準"],
      },
    },
    {
      id: "sample-decision-008",
      content: "無形資産の管理体制を構築予定",
      patternType: "decision",
      sourceText: "ノウハウやデータ資産も含めて無形資産として整理することが重要との意見があり、管理体制の構築を進めることとなった。",
      sourceFileName: "sample_meeting_minutes.txt",
      decisionDate: "2024-10-15",
      confidence: "medium",
      status: "gray",
      qualityScore: 0.7,
      ambiguityFlags: ["管理体制の詳細が未定"],
      guidance: {
        requiredActions: ["無形資産の定義と範囲を明確化する", "管理体制の詳細を策定する"],
        missingInfo: ["管理対象の具体的な範囲", "管理プロセスの詳細"],
      },
    },
    // === 未確定（proposed）===
    {
      id: "sample-decision-009",
      content: "標準化活動への参加（次回議題）",
      patternType: "other",
      sourceText: "標準化活動への参加是非（鈴木課長から提案あり、次回議題）",
      sourceFileName: "sample_meeting_minutes.txt",
      decisionDate: "2024-10-15",
      confidence: "low",
      status: "proposed",
      qualityScore: 0.5,
      ambiguityFlags: ["提案段階", "次回協議予定"],
      guidance: {
        requiredActions: ["標準化活動の参加メリット・デメリットを整理する"],
        missingInfo: ["参加対象の標準化団体", "必要なリソース"],
      },
    },
    {
      id: "sample-decision-010",
      content: "アジア市場向け出願の検討（来期）",
      patternType: "other",
      sourceText: "アジア市場向け出願の要否（来期検討）",
      sourceFileName: "sample_meeting_minutes.txt",
      decisionDate: "2024-10-15",
      confidence: "low",
      status: "proposed",
      qualityScore: 0.5,
      ambiguityFlags: ["来期検討予定", "現時点では方針未定"],
      guidance: {
        requiredActions: ["アジア市場の事業計画を確認する", "出願コストを見積もる"],
        missingInfo: ["対象国", "優先度"],
      },
    },
    {
      id: "sample-decision-011",
      content: "基盤技術と応用技術の線引き（法務確認中）",
      patternType: "other",
      sourceText: "具体的な線引きは法務と調整が必要との結論になった。",
      sourceFileName: "sample_meeting_minutes.txt",
      decisionDate: "2024-10-15",
      confidence: "low",
      status: "proposed",
      qualityScore: 0.55,
      ambiguityFlags: ["法務確認待ち", "具体的な基準が未確定"],
      guidance: {
        requiredActions: ["法務部門と協議する", "線引きの基準案を作成する"],
        missingInfo: ["具体的な基準", "過去の類似ケース"],
      },
    },
  ],
  processedDocuments: [
    {
      fileName: "sample_meeting_minutes.txt",
      documentDate: "2024-10-15",
      decisionCount: 11,
    },
  ],
  timeRange: {
    start: "2024-10-15",
    end: "2024-10-15",
  },
  warnings: [],
  extractedTexts: [
    {
      fileName: "sample_meeting_minutes.txt",
      text: SAMPLE_MEETING_MINUTES,
    },
  ],
};

export const SAMPLE_AMBIGUOUS_DECISIONS_RESULT: DecisionTimelineResult = {
  decisions: [
    {
      id: "sample-ambiguous-001",
      content: "カーボンニュートラル向けセンシング技術の検討を開始予定",
      patternType: "other",
      sourceText: "カーボンニュートラル向けセンシング技術の検討を開始予定",
      sourceFileName: "sample_ambiguous.txt",
      decisionDate: "2024-12-01",
      confidence: "low",
      status: "gray",
      qualityScore: 0.6,
      ambiguityFlags: ["検討段階で未決定", "着手時期が不明確"],
      guidance: {
        requiredActions: ["技術調査を完了する", "予算を確定する"],
        missingInfo: ["技術的な実現可能性", "正確な予算額"],
      },
    },
    {
      id: "sample-ambiguous-002",
      content: "標準化活動はA案とB案で検討中",
      patternType: "other",
      sourceText: "標準化活動への参加はA案とB案で迷ってる",
      sourceFileName: "sample_ambiguous.txt",
      decisionDate: "2024-12-01",
      confidence: "low",
      status: "proposed",
      qualityScore: 0.5,
      ambiguityFlags: ["選択肢が未確定", "判断基準が不明確"],
      guidance: {
        requiredActions: ["A案とB案の比較資料を作成する", "関係者の意見を集約する"],
        missingInfo: ["各案の詳細な工数見積もり", "事業部・研究所の最終意見"],
      },
    },
    {
      id: "sample-ambiguous-003",
      content: "研究完了は2025年度末を目標としているが未定",
      patternType: "other",
      sourceText: "研究完了は2025年度末を目標としているが、正式には未定",
      sourceFileName: "sample_ambiguous.txt",
      decisionDate: "2024-12-01",
      confidence: "low",
      status: "gray",
      qualityScore: 0.5,
      ambiguityFlags: ["正式な決定ではない", "調整中"],
      guidance: {
        requiredActions: ["関係部門と調整を完了する", "正式な完了時期を決定する"],
        missingInfo: ["人員確保の見通し", "他プロジェクトとの優先度"],
      },
    },
    {
      id: "sample-ambiguous-004",
      content: "技術の成熟度を厳格に評価する方向で検討",
      patternType: "other",
      sourceText: "技術の成熟度を厳格に評価する方向で検討してる",
      sourceFileName: "sample_ambiguous.txt",
      decisionDate: "2024-12-01",
      confidence: "low",
      status: "gray",
      qualityScore: 0.6,
      ambiguityFlags: ["方向性のみで具体策未定"],
      guidance: {
        requiredActions: ["具体的な評価基準を策定する", "事業化スピードとのバランスを検討する"],
        missingInfo: ["具体的な基準値", "工数影響"],
      },
    },
    {
      id: "sample-ambiguous-005",
      content: "プロジェクトリーダーは佐藤さんになる可能性が高い",
      patternType: "other",
      sourceText: "プロジェクトリーダーは佐藤さんになる可能性が高い",
      sourceFileName: "sample_ambiguous.txt",
      decisionDate: "2024-12-01",
      confidence: "low",
      status: "proposed",
      qualityScore: 0.5,
      ambiguityFlags: ["正式には未決定"],
      guidance: {
        requiredActions: ["PL担当を正式に決定する"],
        missingInfo: ["本人の承諾", "上長の承認"],
      },
    },
    {
      id: "sample-ambiguous-006",
      content: "当面は個別対応しつつデータ収集",
      patternType: "decision",
      sourceText: "当面は個別対応しつつ、データ収集することとする",
      sourceFileName: "sample_ambiguous.txt",
      decisionDate: "2024-12-05",
      confidence: "medium",
      status: "confirmed",
      qualityScore: 0.7,
    },
    {
      id: "sample-ambiguous-007",
      content: "外部連携先は提案書揃ってから検討予定",
      patternType: "other",
      sourceText: "どこと組むかはまだ決まってない",
      sourceFileName: "sample_ambiguous.txt",
      decisionDate: "2024-12-10",
      confidence: "low",
      status: "gray",
      qualityScore: 0.5,
      ambiguityFlags: ["選定方針が未確定", "評価基準が不明確"],
      guidance: {
        requiredActions: ["選定基準を確定する", "提案書を取得する"],
        missingInfo: ["技術力重視か実績重視かの方針", "評価項目の詳細"],
      },
    },
    {
      id: "sample-ambiguous-008",
      content: "オープンイノベーション活動を今期中に拡大予定",
      patternType: "other",
      sourceText: "オープンイノベーション活動を拡大予定",
      sourceFileName: "sample_ambiguous.txt",
      decisionDate: "2024-12-01",
      confidence: "low",
      status: "proposed",
      qualityScore: 0.5,
      ambiguityFlags: ["具体的な時期が未定", "具体的な計画なし"],
      guidance: {
        requiredActions: ["拡大時期を確定する", "対象領域を選定する"],
        missingInfo: ["具体的なスケジュール", "必要なリソース"],
      },
    },
    {
      id: "sample-ambiguous-009",
      content: "追加予算500〜800万円が必要になる見込み",
      patternType: "other",
      sourceText: "追加予算が必要になる見込み",
      sourceFileName: "sample_ambiguous.txt",
      decisionDate: "2024-12-01",
      confidence: "low",
      status: "proposed",
      qualityScore: 0.5,
      ambiguityFlags: ["金額が不明確", "承認未取得"],
      guidance: {
        requiredActions: ["正確な金額を算出する", "予算承認を得る"],
        missingInfo: ["詳細な内訳", "承認者の了承"],
      },
    },
    {
      id: "sample-ambiguous-010",
      content: "外部研究機関との共同研究を検討中",
      patternType: "other",
      sourceText: "外部研究機関との共同研究も検討中",
      sourceFileName: "sample_ambiguous.txt",
      decisionDate: "2024-12-01",
      confidence: "low",
      status: "proposed",
      qualityScore: 0.4,
      ambiguityFlags: ["判断基準が不明", "コスト未確定"],
      guidance: {
        requiredActions: ["共同研究のコストを見積もる", "内製との比較を行う"],
        missingInfo: ["候補研究機関", "コスト比較結果"],
      },
    },
  ],
  processedDocuments: [
    {
      fileName: "sample_ambiguous.txt",
      documentDate: "2024-12-01",
      decisionCount: 10,
    },
  ],
  timeRange: {
    start: "2024-12-01",
    end: "2024-12-10",
  },
  warnings: [],
  extractedTexts: [
    {
      fileName: "sample_ambiguous.txt",
      text: SAMPLE_AMBIGUOUS_DECISIONS,
    },
  ],
};

/**
 * 重大決定サンプル用の事前定義された分析結果
 * sourceTextは原文から一字一句そのままコピーしてハイライトが正しく動作するようにする
 */
export const SAMPLE_CRITICAL_DECISIONS_RESULT: DecisionTimelineResult = {
  decisions: [
    {
      id: "sample-critical-001",
      content: "先使用権の主張準備を進める",
      patternType: "decision",
      sourceText: "対応方針として、先使用権の主張準備を進めることで合意した。",
      sourceFileName: "sample_critical.txt",
      decisionDate: "2024-11-20",
      confidence: "high",
      status: "confirmed",
      qualityScore: 0.95,
      importance: {
        level: "high",
        categories: ["quality", "contract"],
        reasons: ["知財リスク", "法的対応"],
      },
    },
    {
      id: "sample-critical-002",
      content: "追加費用800万円の承認を申請",
      patternType: "decision",
      sourceText: "予算超過が見込まれるため、追加費用800万円の承認を申請する。",
      sourceFileName: "sample_critical.txt",
      decisionDate: "2024-11-20",
      confidence: "high",
      status: "confirmed",
      qualityScore: 0.9,
      importance: {
        level: "high",
        categories: ["budget"],
        reasons: ["予算変更", "緊急対応"],
      },
    },
    {
      id: "sample-critical-003",
      content: "法務部門との週次状況確認を実施",
      patternType: "agreement",
      sourceText: "法務部門との連携を強化し、週次で状況確認を行うこととする。",
      sourceFileName: "sample_critical.txt",
      decisionDate: "2024-11-20",
      confidence: "high",
      status: "confirmed",
      qualityScore: 0.9,
      importance: {
        level: "high",
        categories: ["contract"],
        reasons: ["法務連携"],
      },
    },
    {
      id: "sample-critical-004",
      content: "追加の技術文書を作成",
      patternType: "decision",
      sourceText: "技術的な差別化ポイントを明確化するため、追加の技術文書を作成することを決定した。",
      sourceFileName: "sample_critical.txt",
      decisionDate: "2024-11-20",
      confidence: "high",
      status: "confirmed",
      qualityScore: 0.9,
      importance: {
        level: "medium",
        categories: ["quality"],
        reasons: ["技術文書"],
      },
    },
    {
      id: "sample-critical-005",
      content: "出願計画をRev.AからRev.Bに変更",
      patternType: "change",
      sourceText: "出願計画をRev.AからRev.Bに変更する。",
      sourceFileName: "sample_critical.txt",
      decisionDate: "2024-11-20",
      confidence: "high",
      status: "confirmed",
      qualityScore: 0.95,
      importance: {
        level: "high",
        categories: ["technical"],
        reasons: ["計画変更"],
      },
    },
    {
      id: "sample-critical-006",
      content: "知財調査頻度を週次に変更",
      patternType: "change",
      sourceText: "知財調査頻度を月次から週次に変更することで合意。",
      sourceFileName: "sample_critical.txt",
      decisionDate: "2024-11-20",
      confidence: "high",
      status: "confirmed",
      qualityScore: 0.9,
      importance: {
        level: "medium",
        categories: ["quality"],
        reasons: ["プロセス変更"],
      },
    },
    {
      id: "sample-critical-007",
      content: "開発人員を2名から4名に増員",
      patternType: "decision",
      sourceText: "開発人員を2名から4名に増員することとする。",
      sourceFileName: "sample_critical.txt",
      decisionDate: "2024-11-20",
      confidence: "high",
      status: "confirmed",
      qualityScore: 0.9,
      importance: {
        level: "medium",
        categories: ["resource"],
        reasons: ["人員増加"],
      },
    },
    {
      id: "sample-critical-008",
      content: "外部専門家との月次レビュー会議を実施",
      patternType: "decision",
      sourceText: "外部専門家との連携を強化し、月1回のレビュー会議を実施する。",
      sourceFileName: "sample_critical.txt",
      decisionDate: "2024-11-20",
      confidence: "high",
      status: "confirmed",
      qualityScore: 0.9,
      importance: {
        level: "medium",
        categories: ["quality"],
        reasons: ["外部連携"],
      },
    },
  ],
  processedDocuments: [
    {
      fileName: "sample_critical.txt",
      documentDate: "2024-11-20",
      decisionCount: 8,
    },
  ],
  timeRange: {
    start: "2024-11-20",
    end: "2024-11-20",
  },
  warnings: [],
  extractedTexts: [
    {
      fileName: "sample_critical.txt",
      text: SAMPLE_CRITICAL_DECISIONS,
    },
  ],
};

/**
 * オムロン技術・知財本部向けシナリオ
 *
 * ストーリー設定:
 * - 中堅研究員（センシング分野5年経験、AI研究3年目）
 * - 新規センシング×AI技術の知財戦略を決定する必要がある
 * - 技術と知財の両面から判断基準を理解したい
 *
 * 技術的背景:
 * - Sensing & Control + Think: オムロンのコア技術体系
 * - 両利きの知財活動: 独占領域と共創領域の使い分け
 * - 無形資産経営: 特許・ノウハウ・データ・人材の統合管理
 */
export const SAMPLE_TECHNOLOGY_IP_STRATEGY = `
【センシング×AI技術 知財戦略検討会 議事録】
日時：2024年8月20日（火）10:00〜12:00
場所：技術・知財本部 第1会議室
出席者：知財戦略G 佐藤主任（ベテラン）、田中（センシングから異動3年目）、
        AI研究G 鈴木課長、外部連携 渡辺

■ 議題1：新規センシング×AI技術の知財出願方針決定

田中より「センシング分野では先行特許の周辺出願で対応していたが、
AI技術との統合では考慮すべき要素があるか」との質問があった。

佐藤主任から以下の知見が共有された。

「技術の独自性が最も重要な判断軸になります。センシングと違い、
AI分野は論文公開が先行する文化があるため、新規性の確保が難しい。
アルゴリズムのコア部分は必ず出願後に論文発表すること。
出願前に論文を出すと、自己公知で新規性が失われる。」

「逆に基盤技術は共同研究で価値を広げる選択肢もあります。
大学との共創で論文の質を上げつつ、応用技術は単独出願する。
ただし、共同研究の知財取り扱いは事前に明確にすること。」

「また、知財戦略を決める際は事業戦略との整合性が重要です。
FA事業部への技術移管時期、製品化ロードマップを確認し、
出願タイミングを最適化する必要があります。」

■ 議題2：過去の知財出願実績の共有

鈴木課長より過去5件の出願実績が報告された。

1. P19-001234（2019年）: 画像センシングAI 基本特許10件
   - 単独出願、製品化前に権利化完了
   - 「FA事業部への移管時に価値を発揮した」（佐藤主任コメント）

2. P20-002345（2020年）: 推論エンジン 大学共同出願5件
   - 東京大学との共同研究成果
   - 「基盤技術は共有、応用技術は単独という取り決めが有効だった」

3. P21-003456（2021年）: エッジAI 海外出願15カ国
   - 米国・欧州・中国を優先、段階的に拡大
   - 「各国の審査状況を見ながら戦略的に対応」

4. P22-004567（2022年）: センシング×制御 標準化提案
   - IEC標準化委員会への技術提案
   - 「標準化と知財の両立で市場影響力を確保」

5. P23-005678（2023年）: 無形資産として技術ノウハウを整理
   - 特許だけでなくデータ資産も含めた管理体制構築
   - 「無形資産経営の先行事例として評価された」

■ 議題3：新規技術の条件整理

田中が担当する新規技術の条件を確認。

・技術領域: センシング×AI×制御の統合
・事業接続: FA事業部（2025年度製品化予定）
・競合状況: A社が類似技術で先行出願あり
・共創機会: 大阪大学との共同研究を検討中
・社会課題: カーボンニュートラル対応技術

佐藤主任「この条件なら、コア技術は単独出願優先。
競合が先行しているので、差別化ポイントを明確にした請求項設計が重要。
大学との共同研究は基盤技術に限定し、応用技術は単独で確保すべき。
出願と論文発表のタイミングは慎重に計画すること。」

■ 決定事項
1. 出願方針: コア技術は単独出願優先
2. 共同研究: 基盤技術に限定
3. 海外出願: 米国・欧州・中国を優先、段階的に拡大
4. 論文発表: 必ず出願後に限定

■ 宿題
・田中: 出願対象技術の整理、次回会議で報告
・鈴木: 競合特許の詳細調査
・渡辺: 大学との共同研究契約条件の確認

次回：2024年9月10日（火）14:00〜


【知財戦略 ベテランの知見メモ】
作成者：田中（佐藤主任からのヒアリング内容をまとめ）
日付：2024年8月25日

■ 判断軸の優先順位（佐藤主任の経験則）

1. 技術の独自性が最も重要
   「他社との差別化ポイントで8割方決まる。独自性が高ければ単独出願一択。」

2. 事業戦略との整合性は二番目
   「製品化1年前には基本特許を権利化。ギリギリでは事業部が困る。」

3. 共創機会は最後の調整
   「共同研究は魅力的だが、知財の取り扱いを曖昧にしたまま始めると後悔する。」

4. 論文発表との両立
   「出願と論文のタイミング管理が重要。出願前に論文を出した失敗例は多い。」

■ 失敗事例から学んだこと

「過去に、論文発表を急いで出願前に公開してしまった案件があった。
国際学会での発表を優先したが、結果的に自己公知で新規性を失った。
特許庁への出願日が論文公開日より後だったため、権利化できなかった。
今では必ず『出願後に論文』のルールを徹底している。」

■ 共同研究の注意点

「大学との共同研究は価値があるが、知財の取り扱いは事前に明確にすること。
P20-002345のケースでは、基盤技術は共有、応用技術は単独という
取り決めを事前にしておいたので、後から揉めることがなかった。
曖昧なまま始めると、成果が出た時に帰属で揉める。」

以上
`;

/**
 * ベテランの声を含むサンプル過去事例
 * 意思決定ナビゲーターで表示するためのデータ
 *
 * シナリオ: 技術・知財戦略の意思決定
 * - センシング分野の経験を持つ中堅研究員が初めて携わる
 * - 技術と知財の両面からの判断が必要
 * - 案件番号形式: Pxx-xxxxxx（プロジェクト）
 */
export const SAMPLE_VETERAN_PAST_CASES = [
  {
    id: "veteran-case-001",
    content: "画像センシングAI技術で単独出願10件を実施（P19-001234）",
    similarity: 92,
    patternType: "adoption" as const,
    status: "confirmed" as const,
    sourceFileName: "2019年_P19-001234_知財戦略会議議事録.txt",
    decisionDate: "2019-03-15",
    adoptedConclusion: "コア技術の独自性が高く、単独出願で権利化。FA事業部への技術移管時に競争優位性を確保。",
    perspectives: ["技術独自性", "事業接続", "権利化スピード"],
    quote: "技術の独自性が高い場合は迷わず単独出願。製品化1年前には権利化を完了しておくことで、事業部への移管がスムーズになる。",
    quoteSource: {
      date: "2019年3月",
      meetingName: "P19-001234 知財戦略会議",
      speakerRole: "知財戦略G 佐藤主任",
    },
    veteranInsight: "出願から権利化まで平均2〜3年かかる。製品化スケジュールから逆算した出願計画が必要。",
  },
  {
    id: "veteran-case-002",
    content: "推論エンジン技術で大学共同出願5件を実施（P20-002345）",
    similarity: 85,
    patternType: "decision" as const,
    status: "confirmed" as const,
    sourceFileName: "2020年_P20-002345_共同研究会議議事録.txt",
    decisionDate: "2020-06-20",
    adoptedConclusion: "基盤技術は共有、応用技術は単独という取り決めで大学との共同出願を実施。論文発表も両立。",
    perspectives: ["共創価値", "知財取り扱い", "論文発表"],
    quote: "共同研究は価値があるが、知財の取り扱いは事前に明確にすること。曖昧なまま始めると、成果が出た時に帰属で揉める。",
    quoteSource: {
      date: "2020年6月",
      meetingName: "P20-002345 共同研究知財会議",
      speakerRole: "外部連携 渡辺課長",
    },
    veteranInsight: "大学との共同研究では、基盤・応用の線引きを事前に明確化。契約書に知財条項を入れることで後からのトラブルを防ぐ。",
  },
  {
    id: "veteran-case-003",
    content: "エッジAI技術で海外15カ国に出願（P21-003456）",
    similarity: 88,
    patternType: "adoption" as const,
    status: "confirmed" as const,
    sourceFileName: "2021年_P21-003456_グローバル知財会議議事録.txt",
    decisionDate: "2021-04-10",
    adoptedConclusion: "米国・欧州・中国を優先し、各国の審査状況を見ながら段階的に出願国を拡大。",
    perspectives: ["グローバル戦略", "審査状況", "コスト最適化"],
    quote: "海外出願は費用がかかるので、市場重要度と審査状況を見ながら段階的に進める。全部一気に出願する必要はない。",
    quoteSource: {
      date: "2021年4月",
      meetingName: "P21-003456 グローバル知財会議",
      speakerRole: "知財戦略G 佐藤主任",
    },
    veteranInsight: "海外出願は優先度をつけて段階的に。各国の審査期間や費用を考慮した戦略が重要。",
  },
  {
    id: "veteran-case-004",
    content: "センシング×制御技術で標準化提案を実施（P22-004567）",
    similarity: 78,
    patternType: "agreement" as const,
    status: "confirmed" as const,
    sourceFileName: "2022年_P22-004567_標準化戦略会議議事録.txt",
    decisionDate: "2022-02-15",
    adoptedConclusion: "IEC標準化委員会への技術提案と並行して特許出願。標準必須特許化で市場影響力を確保。",
    perspectives: ["標準化", "市場影響力", "両利きの知財"],
    quote: "標準化活動と知財戦略は両立できる。標準に採用された技術の特許は価値が高い。ただし、標準化活動での情報開示には注意が必要。",
    quoteSource: {
      date: "2022年2月",
      meetingName: "P22-004567 標準化戦略会議",
      speakerRole: "AI研究G 鈴木課長",
    },
    veteranInsight: "標準化活動は技術の普及と権利確保の両方を狙える。ただし、標準化団体のIP ポリシーを理解した上で参加すること。",
  },
];

/**
 * 意思決定ナビゲーター用サンプルデータ
 * 過去採用情報を含むノードデータ
 *
 * シナリオ: 技術・知財戦略の意思決定
 * - 出願方針、共創戦略、海外展開の判断
 * - 事業戦略との整合性確認が重要
 * - 案件番号形式: Pxx-xxxxxx（プロジェクト）
 */
export const SAMPLE_DECISION_NODES_WITH_PAST_ADOPTIONS = {
  // 出願方針: 単独出願優先
  filingStrategySolo: {
    id: "filing-solo",
    label: "単独出願優先",
    description: "コア技術の独自性が高い場合に選択。競争優位性を確保し、事業部への技術移管時に価値を発揮。",
    pastAdoptions: {
      count: 3,
      rationales: [
        "技術独自性が高く競争優位を確保したい（P19-001234）",
        "製品化前に権利化完了、事業部移管時に価値発揮（P19-001234）",
        "競合先行出願への差別化対応（P21-003456）",
      ],
    },
  },
  // 出願方針: 共同出願
  filingStrategyJoint: {
    id: "filing-joint",
    label: "共同出願（大学連携）",
    description: "基盤技術を共有し価値を拡大。応用技術は単独確保という取り決めが有効。",
    pastAdoptions: {
      count: 2,
      rationales: [
        "基盤技術共有・応用技術単独の取り決めで円滑に推進（P20-002345）",
        "論文発表との両立、学術価値と事業価値の両方を確保（P20-002345）",
      ],
    },
  },
  // 海外出願: 主要3カ国優先
  overseasPriorityMarkets: {
    id: "overseas-priority",
    label: "主要3カ国優先（米欧中）",
    description: "市場重要度の高い米国・欧州・中国を優先し、審査状況を見ながら段階的に拡大。",
    pastAdoptions: {
      count: 3,
      rationales: [
        "市場重要度と審査状況を見ながら段階的に対応（P21-003456）",
        "費用対効果を考慮した戦略的出願（P21-003456）",
        "各国の審査期間を考慮したスケジュール管理（P22-004567）",
      ],
    },
  },
  // 海外出願: 全方位出願
  overseasComprehensive: {
    id: "overseas-comprehensive",
    label: "全方位出願（15カ国以上）",
    description: "グローバル展開を見据えた包括的な権利確保。費用はかかるが市場カバレッジを最大化。",
    pastAdoptions: {
      count: 1,
      rationales: [
        "グローバル市場での競争優位確保のため包括出願（P21-003456）",
      ],
    },
  },
  // 標準化: 積極参加
  standardizationActive: {
    id: "std-active",
    label: "標準化積極参加",
    description: "IEC等の標準化委員会に参加し、技術提案と特許出願を並行。標準必須特許化で市場影響力確保。",
    pastAdoptions: {
      count: 1,
      rationales: [
        "標準採用技術の特許価値向上、市場影響力確保（P22-004567）",
      ],
    },
  },
  // 標準化: 様子見
  standardizationPassive: {
    id: "std-passive",
    label: "標準化様子見",
    description: "リソース温存のため標準化活動は最小限。競合動向を見ながら参加タイミングを計る。",
    pastAdoptions: {
      count: 0,
      rationales: [],
    },
  },
};
