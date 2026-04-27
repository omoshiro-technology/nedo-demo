/**
 * BreinModel 会議 AI モック応答
 *
 * ANTHROPIC_API_KEY が未設定のとき、AI 呼び出しの代わりに
 * このモックが使われる。デモ用途でキーが無くても動くようにする目的。
 *
 * 特徴:
 *   - キャラクター ID ごとにテンプレートを持つ（5人 = 村田/安藤/黒田/中島/藤原）
 *   - 未定義キャラは汎用テンプレにフォールバック
 *   - テーマ・ターン数に応じてバリエーションを出す
 *   - 迷走中タグは使わない（デモで悪目立ちする）
 */

import type { Character } from "./types"

type MockUtteranceTemplate = {
  utterance: string
  tag: "気づき" | "合意" | "重要な情報" | "戻って考える" | "問題提起"
}

// キャラクター ID ごとの発言テンプレート
// {theme} を含めるとテーマ名に置換される
const CHARACTER_TEMPLATES: Record<number, MockUtteranceTemplate[]> = {
  // 村田 鉄男（加工経験）
  1: [
    { utterance: "現場で言うと、{theme}は段取りが肝心だな。最初の一工程で材料の癖を掴んでおかないと、後で大変なことになる。俺の経験だと、初期ロットで摩耗パターンを見極めるのが一番堅実だ。", tag: "重要な情報" },
    { utterance: "その話、昔似た案件で痛い目みたことがある。見た目はいけそうでも、量産で条件が固定されると一気に不良が出る。試作段階で条件範囲を広めに振って検証すべきだ。", tag: "気づき" },
    { utterance: "工程順を変えると結果が全然違うことがある。例えば絞りと焼鈍の順序一つでも、最終的な寸法精度に効いてくる。ここはベテランの勘所だな。", tag: "重要な情報" },
    { utterance: "俺は賛成だ。その方向で行けば、現場の作業者も迷わない。特に若手が再現できる標準が作れる点が大きい。", tag: "合意" },
    { utterance: "ちょっと待て、その前提でいいのか？顧客の図面公差をもう一度確認しないと、工程が足りなくなる可能性もある。", tag: "問題提起" },
  ],

  // 安藤 美咲（品質・仕様）
  2: [
    { utterance: "本当にそうでしょうか？顧客仕様書の公差要求を詰めてから工程を考えないと、後で品質トラブルが出ます。特に{theme}のような案件では、仕様の解釈一つで工程数が変わります。", tag: "問題提起" },
    { utterance: "品質監査の観点からすると、この論点は工程FMEAで先に潰しておくべきです。失敗モードを事前に洗い出せば、量産トラブルを大幅に減らせます。", tag: "重要な情報" },
    { utterance: "今のお話、試作段階と量産段階で分けて整理する必要があります。試作で成立しても量産で破綻する条件はよくあります。根本的に違うアプローチが必要です。", tag: "戻って考える" },
    { utterance: "確認ですが、顧客の検査基準は明文化されていますか？曖昧なまま進むと、後で評価基準の認識ズレが発生します。先に擦り合わせが必要です。", tag: "問題提起" },
    { utterance: "村田さんのご提案に賛成です。実際、過去の類似案件でもその方法で品質が安定しました。データで裏付けも取れています。", tag: "合意" },
  ],

  // 黒田 浩一（金型）
  3: [
    { utterance: "金型の立場から言わせてもらうと、{theme}では型の冷却時間とサイクルタイムのバランスが効いてきます。急ぐと型寿命が落ちる、ゆっくりだと生産性が落ちる。ここが腕の見せ所ですね。", tag: "重要な情報" },
    { utterance: "その案だと型の抜き勾配が厳しいかもしれません。私の経験上、材料の流動性を見ながら勾配を2〜3度広げた方が安全です。", tag: "気づき" },
    { utterance: "安藤さんの懸念はもっともです。私も型の摩耗を実際に測ってきましたが、仕様通りに作っても摩耗カーブは想定より早く出ます。型寿命の見積もりは保守的にすべきです。", tag: "合意" },
    { utterance: "一つ確認したいのですが、使用する鋼材のグレードはどうしますか？SKD61とDC53では寿命が変わってきます。初期投資とランニングのバランスで判断が必要です。", tag: "問題提起" },
    { utterance: "型構造は3プレート構成で行きましょう。その方がメンテ性も良いですし、長期的にはコストを下げられます。", tag: "重要な情報" },
  ],

  // 中島 康太（経営・生産）
  4: [
    { utterance: "経営視点で言うと、{theme}のLCC（ライフサイクルコスト）をきちんと積み上げたいところです。初期投資が高くても、ランニングで有利なら5年トータルで勝てます。", tag: "重要な情報" },
    { utterance: "このまま進めると、納期的には厳しいかもしれません。外注先のキャパシティも見ながら、内製と外注のバランスを考えるべきです。", tag: "問題提起" },
    { utterance: "村田さんと黒田さんの意見を聞くと、工程設計と型設計を同時進行する方向ですね。それなら並行開発できる体制を組めば、リードタイムも短縮できます。", tag: "合意" },
    { utterance: "顧客折衝の観点では、追加コストが出る案件ほど先に顧客と握っておきたい。後から請求すると揉めます。", tag: "気づき" },
    { utterance: "一度整理しましょう。品質・コスト・納期、どれを優先順位の1位にするかで、議論の方向が変わります。", tag: "戻って考える" },
  ],

  // 藤原 翔太（CAE）
  5: [
    { utterance: "CAEシミュレーションで検証してみた結果、{theme}の応力集中は局部的に想定より高くなる可能性があります。形状を少し見直せば、応力を2割程度下げられそうです。", tag: "重要な情報" },
    { utterance: "試作前にシミュレーションで条件を追い込みたいと考えています。解析で絞った条件なら、試作回数を半分に減らせます。", tag: "気づき" },
    { utterance: "先輩方のご知見、とても勉強になります。データと突き合わせると、確かに摩耗の進行は数値モデルと合致しています。信頼できる判断材料になります。", tag: "合意" },
    { utterance: "一つ質問よろしいでしょうか。スプリングバックの補正値は、過去データから近似で決めるのか、逐次CAEで追い込むのか、どちらが効率的でしょうか？", tag: "問題提起" },
    { utterance: "シミュレーション条件が実機と乖離していないか、定期的に検証したいです。月1回くらい、実測とシミュレーション値を突き合わせる会を設けませんか。", tag: "気づき" },
  ],
}

// キャラテンプレートが無い場合のフォールバック（任意のキャラID向け）
const FALLBACK_TEMPLATES: MockUtteranceTemplate[] = [
  { utterance: "その観点は重要ですね。{theme}について、私の立場からも補足させてください。過去の知見を活かせば、より堅実な結論に近づけます。", tag: "気づき" },
  { utterance: "今のお話、別の角度から考えてみる価値があります。前提条件を確認した上で、改めて整理したいです。", tag: "戻って考える" },
  { utterance: "皆さんのご意見を聞いて、方向性がまとまってきた気がします。次のステップに進んで良さそうです。", tag: "合意" },
  { utterance: "一つ気になることがあります。{theme}の場合、想定外のリスクが潜んでいる可能性はないでしょうか。", tag: "問題提起" },
  { utterance: "これまでの議論を踏まえると、いくつかの選択肢が見えてきました。比較表にまとめましょう。", tag: "重要な情報" },
]

/**
 * モック発言を生成する
 *
 * 「AI が考えている間」の体感を演出するため、意図的に遅延を入れる。
 * 1.8 〜 3.0 秒の範囲でランダムに揺らす。
 */
export async function generateMockTurn(
  character: Character,
  theme: string,
  turn: number,
): Promise<{ thought: string; utterance: string; tag: string; isFinished: boolean; finishReason: string | null; usedKnowledgeIds: string[] }> {
  // 考えている感の演出（1.8〜3.0秒）
  const delayMs = 1800 + Math.random() * 1200
  await new Promise((resolve) => setTimeout(resolve, delayMs))

  const templates = CHARACTER_TEMPLATES[character.id] ?? FALLBACK_TEMPLATES
  const template = templates[turn % templates.length]
  const utterance = template.utterance.replace(/\{theme\}/g, theme)

  return {
    thought: `${character.name}の${template.tag}発言（モック）`,
    utterance,
    tag: template.tag,
    isFinished: false,
    finishReason: null,
    usedKnowledgeIds: [],
  }
}

/**
 * モックホワイトボード HTML を生成する
 *
 * ホワイトボード更新は AI の総合処理なので少し長めの遅延を入れる。
 */
export async function generateMockWhiteboard(theme: string, purpose: string | undefined, turn: number): Promise<string> {
  // 2.5〜4.0 秒の遅延（ホワイトボード整理は時間かかる演出）
  const delayMs = 2500 + Math.random() * 1500
  await new Promise((resolve) => setTimeout(resolve, delayMs))
  const pointCount = Math.min(turn + 2, 6)
  const points = [
    "論点の整理と優先順位付け",
    "品質・コスト・納期のトレードオフ",
    "試作段階での検証ポイント",
    "量産時の再現性の確保",
    "過去事例からの学び",
    "合意事項と未決事項の明確化",
  ].slice(0, pointCount)

  return `
<div style="font-family: 'Noto Sans JP', sans-serif; background: #f5f0e8; padding: 24px; border-radius: 8px; min-height: 400px;">
  <div style="text-align:center; margin-bottom: 20px;">
    <div style="display:inline-block; background:#2c3e50; color:#fff; padding:10px 32px; border-radius:4px; font-size:1.2em; font-weight:bold;">
      🏭 ${theme}
    </div>
    ${purpose ? `<div style="margin-top:6px; color:#666; font-size:0.85em;">目的: ${purpose}</div>` : ""}
    <div style="margin-top:4px; color:#aaa; font-size:0.75em;">（デモモックデータ）</div>
  </div>

  <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px;">
    ${points.map((p, i) => `
      <div style="background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:12px;">
        <div style="font-size:0.75em; color:#6b7280; margin-bottom:4px;">論点 ${i + 1}</div>
        <strong>${p}</strong>
      </div>
    `).join("")}
  </div>

  <div style="margin-top:20px; padding-top:16px; border-top:1px solid #e5e7eb; font-size:0.8em; color:#6b7280;">
    ターン ${turn + 1} 時点の議論整理（モック表示）
  </div>
</div>
`.trim()
}

/**
 * ANTHROPIC_API_KEY が未設定かを返す（モックを使うべきかの判定）
 */
export function shouldUseMock(): boolean {
  return !process.env.ANTHROPIC_API_KEY
}
