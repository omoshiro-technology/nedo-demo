"use client"

import { useState, useMemo } from "react"

// ============================================================
// 型定義
// ============================================================

type QcdesImpact = {
  quality?: { impact: string; description: string }
  cost?: { impact: string; description: string }
  delivery?: { impact: string; description: string }
}

type DecisionEntry = {
  id: string
  sessionId: string
  sessionTitle: string
  label: string
  description: string
  level: string
  rationale: string
  confidence?: number
  qcdesImpact?: QcdesImpact
  tradeoffs?: { give: string; get: string }[]
  date: string
  user: string
}

// ============================================================
// デモ用データ
// ============================================================

const LEVEL_LABELS: Record<string, string> = {
  strategy: "大方針",
  tactic: "戦術",
  action: "アクション",
  "sub-action": "詳細アクション",
  criteria: "判断軸",
}

const DEMO_DECISIONS: DecisionEntry[] = [
  // セッション1: SUS304深絞り（メインデモ）
  {
    id: "d-001", sessionId: "sess-001", sessionTitle: "SUS304 t1.5 深絞り形状 — 工程設計方針",
    label: "4工程（絞り→絞り→リストライク→トリム）",
    description: "型費+25%、不良率 2%→0.3%。サイクルタイムも改善。",
    level: "strategy", confidence: 85,
    rationale: "3工程は加工硬化集中で不良率2%以上。4工程なら不良率0.3%で品質安定、型費増200万円を不良コスト削減300万円/年で1年回収。",
    qcdesImpact: {
      quality: { impact: "positive", description: "不良率2%→0.3%に改善" },
      cost: { impact: "negative", description: "型費+25%（約200万円増）。不良コスト削減で1年以内回収" },
      delivery: { impact: "positive", description: "サイクルタイム改善により生産能力向上" },
    },
    tradeoffs: [{ give: "型費が約25%（200万円）増加", get: "不良率2%→0.3%、サイクルタイム改善、量産安定性向上" }],
    date: "2026-04-10", user: "田中 大輝",
  },
  {
    id: "d-002", sessionId: "sess-001", sessionTitle: "SUS304 t1.5 深絞り形状 — 工程設計方針",
    label: "焼鈍なしで加工硬化を4工程に分散",
    description: "各工程の成形量を抑え割れリスクを分散。焼鈍コスト・納期を削減。",
    level: "tactic", confidence: 80,
    rationale: "焼鈍挿入は寸法安定性を逆に悪化させるリスク。4工程分散なら焼鈍なしでも硬化を制御でき、コスト・納期・精度の全てで有利。",
    qcdesImpact: {
      quality: { impact: "positive", description: "焼鈍の寸法変動リスクを排除し寸法精度が安定" },
      cost: { impact: "positive", description: "焼鈍コスト（1工程+α）と納期2日分を削減" },
      delivery: { impact: "positive", description: "焼鈍工程分の納期2日短縮" },
    },
    tradeoffs: [{ give: "焼鈍による安全マージンを放棄", get: "寸法精度安定、コスト削減、納期短縮" }],
    date: "2026-04-10", user: "田中 大輝",
  },
  {
    id: "d-003", sessionId: "sess-001", sessionTitle: "SUS304 t1.5 深絞り形状 — 工程設計方針",
    label: "型摩耗閾値を実測＋CAEで数値化してLCC算出",
    description: "検証約3週間。摩耗量→メンテ周期→停止コスト→全体LCC確定。",
    level: "strategy", confidence: 82,
    rationale: "型摩耗速度を実測データで定量化し、CAEで検証。メンテ周期→停止コスト→LCCの因果チェーンを数値で確定させる。",
    date: "2026-04-10", user: "田中 大輝",
  },
  {
    id: "d-004", sessionId: "sess-001", sessionTitle: "SUS304 t1.5 深絞り形状 — 工程設計方針",
    label: "三点検証（現場感覚×実測×CAE）で閾値確定",
    description: "割れ急増する摩耗量を現場・実測・シミュレーションの三方向から検証。",
    level: "tactic", confidence: 85,
    rationale: "現場のベテラン感覚だけでも、CAE単独でも不十分。三方向から交差検証することで、量産で本当に使える摩耗閾値が確定する。",
    date: "2026-04-10", user: "田中 大輝",
  },
  {
    id: "d-005", sessionId: "sess-001", sessionTitle: "SUS304 t1.5 深絞り形状 — 工程設計方針",
    label: "LCC比較表を作成（型費＋メンテ費＋停止コスト＋不良コスト）",
    description: "型費＋メンテ費＋停止コスト＋不良コストの総合比較表。経営判断の根拠。",
    level: "action", confidence: 90,
    rationale: "個別のコスト比較では全体最適が見えない。4項目を統合した比較表があれば、経営層への説明と意思決定が一回で完了する。",
    date: "2026-04-10", user: "田中 大輝",
  },
  {
    id: "d-006", sessionId: "sess-001", sessionTitle: "SUS304 t1.5 深絞り形状 — 工程設計方針",
    label: "3段階検証（初期・中期・後期）で型摩耗パターンを把握",
    description: "型分解→段差実測→摩耗パターン記録。量産開始約4週間遅延。",
    level: "strategy", confidence: 78,
    rationale: "初期状態だけでは量産中盤以降の品質変動を予測できない。3段階で摩耗進行パターンを記録しておけば、量産での異常検知が可能になる。",
    date: "2026-04-10", user: "田中 大輝",
  },
  {
    id: "d-007", sessionId: "sess-001", sessionTitle: "SUS304 t1.5 深絞り形状 — 工程設計方針",
    label: "標準フォーマットで記録を統一し属人化防止",
    description: "写真の撮り方・測定位置・硬さ測定箇所を全部統一。",
    level: "tactic", confidence: 88,
    rationale: "記録フォーマットが統一されていないと、試作と量産のデータ比較ができず、メンテ判断が担当者の記憶に依存してしまう。",
    date: "2026-04-10", user: "田中 大輝",
  },
  {
    id: "d-008", sessionId: "sess-001", sessionTitle: "SUS304 t1.5 深絞り形状 — 工程設計方針",
    label: "摩耗量○mmを超えたらメンテ必要の判定基準を策定",
    description: "黒田の型分解実測＋藤原のCAE逆算で割れ急増の閾値を特定。",
    level: "sub-action", confidence: 88,
    rationale: "摩耗量の閾値を数値で定義し、誰が見ても同じ判断ができる基準を確立する。LCC計算の入力値も確定。",
    date: "2026-04-10", user: "田中 大輝",
  },

  // セッション2: AL5052 曲げ加工
  {
    id: "d-101", sessionId: "sess-002", sessionTitle: "AL5052 t2.0 曲げ加工 — スプリングバック対策",
    label: "オーバーベンド角度を材料ロットごとに調整",
    description: "ロット間の引張強度ばらつき（±15MPa）を補正。",
    level: "strategy", confidence: 82,
    rationale: "AL5052は圧延方向で機械的性質が変動。ロットごとの引張強度データからオーバーベンド角を算出し、角度精度±0.5°を実現。",
    qcdesImpact: {
      quality: { impact: "positive", description: "曲げ角度精度±0.5°を安定的に達成" },
      cost: { impact: "neutral", description: "調整工数は増えるが不良削減で相殺" },
      delivery: { impact: "neutral", description: "初回セットアップ+10分、以降影響なし" },
    },
    date: "2026-04-08", user: "田中 大輝",
  },
  {
    id: "d-102", sessionId: "sess-002", sessionTitle: "AL5052 t2.0 曲げ加工 — スプリングバック対策",
    label: "V幅を板厚の8倍に設定（標準6倍から変更）",
    description: "V幅拡大でスプリングバック量を20%低減。",
    level: "tactic", confidence: 78,
    rationale: "V幅6倍では曲げ内Rが小さくなりすぎ、スプリングバック量が不安定。8倍にすることで成形力が均一化し再現性が向上。",
    date: "2026-04-08", user: "田中 大輝",
  },

  // セッション3: SPCC 順送プレス
  {
    id: "d-201", sessionId: "sess-003", sessionTitle: "SPCC t1.2 順送プレス — 搬送ピッチ最適化",
    label: "搬送ピッチ22mm（材料歩留まり重視）",
    description: "ブランク間距離を最小化し歩留まり率92%を達成。",
    level: "strategy", confidence: 88,
    rationale: "月産50万個のコスト構造では材料費が支配的。ピッチ22mmで歩留まり92%、ピッチ25mmの87%より年間材料費120万円削減。",
    qcdesImpact: {
      quality: { impact: "neutral", description: "製品品質への影響なし（FEM解析済み）" },
      cost: { impact: "positive", description: "年間材料費120万円削減" },
      delivery: { impact: "positive", description: "金型メンテ周期延長（材料応力低減による）" },
    },
    date: "2026-04-05", user: "佐藤 健一",
  },
  {
    id: "d-202", sessionId: "sess-003", sessionTitle: "SPCC t1.2 順送プレス — 搬送ピッチ最適化",
    label: "パイロットピン径をφ3.0→φ2.5に変更",
    description: "ピッチ縮小に伴うパイロット穴位置の精度確保。",
    level: "tactic", confidence: 75,
    rationale: "ピッチ22mmではφ3.0パイロットの配置余裕が不足。φ2.5に縮小しても位置決め精度±0.02mmは維持可能（実績あり）。",
    date: "2026-04-05", user: "佐藤 健一",
  },

  // セッション4: SUS316 深絞り
  {
    id: "d-301", sessionId: "sess-004", sessionTitle: "SUS316 t1.0 深絞り — 潤滑条件選定",
    label: "塩素系潤滑油からボロン系に切替",
    description: "環境規制対応と成形性の両立。",
    level: "strategy", confidence: 80,
    rationale: "2027年の塩素系規制強化を見据え、ボロン系で同等の成形性（摩擦係数μ=0.08）を確認。切替コストは半年で回収。",
    qcdesImpact: {
      quality: { impact: "neutral", description: "成形性は同等（μ=0.08維持）" },
      cost: { impact: "negative", description: "潤滑油単価1.5倍。ただし洗浄工程簡略化で相殺" },
      delivery: { impact: "positive", description: "洗浄工程短縮により1個あたり3秒短縮" },
    },
    date: "2026-04-03", user: "田中 大輝",
  },
  {
    id: "d-302", sessionId: "sess-004", sessionTitle: "SUS316 t1.0 深絞り — 潤滑条件選定",
    label: "塗布量を0.8g/m²に統一（従来は作業者任せ）",
    description: "塗布量のばらつきを排除し品質安定化。",
    level: "action", confidence: 85,
    rationale: "作業者による塗布量のばらつき（0.5〜1.2g/m²）が割れ発生率の変動要因。0.8g/m²に標準化し不良率を0.5%低減。",
    date: "2026-04-03", user: "田中 大輝",
  },

  // セッション5: SECC めっき鋼板
  {
    id: "d-401", sessionId: "sess-005", sessionTitle: "SECC t0.8 めっき鋼板 — 型かじり対策",
    label: "TiCNコーティング＋表面粗さRa0.1μm仕上げ",
    description: "型寿命8万ショットでコスト最適。TD処理より安価。",
    level: "strategy", confidence: 83,
    rationale: "TD処理（寿命10万ショット・40万円）vs TiCN（8万ショット・15万円）。型4本×年2回再処理のトータルコストでTiCNが年間200万円有利。",
    tradeoffs: [{ give: "型寿命が10万→8万ショットに低下", get: "再処理コスト年間200万円削減" }],
    date: "2026-03-28", user: "佐藤 健一",
  },

  // セッション6: ハイテン材
  {
    id: "d-501", sessionId: "sess-006", sessionTitle: "JSC780 t1.4 ハイテン材 — 割れ限界の検証方針",
    label: "成形限界線図（FLD）を実測で作成",
    description: "材料メーカー提供値ではなく実測データで設計。",
    level: "strategy", confidence: 90,
    rationale: "メーカーFLDは標準条件での値。実際のプレス速度・温度条件では10〜15%低い成形限界が実測で確認されており、安全率の根拠が不明確になる。",
    date: "2026-03-25", user: "田中 大輝",
  },
  {
    id: "d-502", sessionId: "sess-006", sessionTitle: "JSC780 t1.4 ハイテン材 — 割れ限界の検証方針",
    label: "ホットスタンプではなく冷間プレス+焼戻しを採用",
    description: "設備投資を抑えつつ必要強度を確保。",
    level: "strategy", confidence: 72,
    rationale: "ホットスタンプは設備投資3,000万円。冷間プレス+焼戻しなら既存設備で対応可能、強度1,200MPa達成を試作で確認済み。",
    qcdesImpact: {
      quality: { impact: "neutral", description: "必要強度1,200MPaを達成（試作確認済み）" },
      cost: { impact: "positive", description: "設備投資3,000万円を回避" },
      delivery: { impact: "positive", description: "既存設備で即量産対応可能" },
    },
    date: "2026-03-25", user: "田中 大輝",
  },
]

const ALL_SESSIONS = [...new Set(DEMO_DECISIONS.map(d => d.sessionId))].map(sid => {
  const first = DEMO_DECISIONS.find(d => d.sessionId === sid)!
  return { id: sid, title: first.sessionTitle, date: first.date, user: first.user }
})

// ============================================================
// QCDES バッジ
// ============================================================

function ImpactBadge({ label, impact }: { label: string; impact: string }) {
  const colors: Record<string, string> = {
    positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
    negative: "bg-red-50 text-red-700 border-red-200",
    neutral: "bg-slate-50 text-slate-500 border-slate-200",
  }
  const icons: Record<string, string> = { positive: "+", negative: "-", neutral: "=" }
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors[impact] ?? colors.neutral}`}>
      <span className="font-bold">{icons[impact] ?? "="}</span>{label}
    </span>
  )
}

// ============================================================
// メインページ
// ============================================================

export default function DecisionListPage() {
  const [query, setQuery] = useState("")
  const [sessionFilter, setSessionFilter] = useState<string>("all")
  const [levelFilter, setLevelFilter] = useState<string>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return DEMO_DECISIONS.filter(d => {
      if (sessionFilter !== "all" && d.sessionId !== sessionFilter) return false
      if (levelFilter !== "all" && d.level !== levelFilter) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        return (
          d.label.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.rationale.toLowerCase().includes(q) ||
          d.sessionTitle.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [query, sessionFilter, levelFilter])

  const sessionCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of DEMO_DECISIONS) {
      map.set(d.sessionId, (map.get(d.sessionId) ?? 0) + 1)
    }
    return map
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">意思決定ログ</h1>
              <p className="text-sm text-gray-400 mt-0.5">{DEMO_DECISIONS.length}件の判断記録</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {ALL_SESSIONS.length} セッション
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                {new Set(DEMO_DECISIONS.map(d => d.user)).size} ユーザー
              </span>
            </div>
          </div>

          {/* 検索 + フィルター */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="キーワードで検索... (例: 加工硬化、型摩耗、LCC)"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <select
              value={sessionFilter}
              onChange={e => setSessionFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">全セッション</option>
              {ALL_SESSIONS.map(s => (
                <option key={s.id} value={s.id}>{s.title.split("—")[0].trim()} ({sessionCounts.get(s.id)})</option>
              ))}
            </select>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">全レベル</option>
              {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* リスト */}
      <div className="max-w-5xl mx-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">該当する判断記録がありません</p>
            <p className="text-sm mt-1">検索条件を変更してください</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(d => {
              const isExpanded = expandedId === d.id
              return (
                <div
                  key={d.id}
                  className={`bg-white rounded-lg border transition-all cursor-pointer ${isExpanded ? "border-blue-300 shadow-md" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                >
                  {/* コンパクト行 */}
                  <div className="px-4 py-3 flex items-center gap-3">
                    <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border ${
                      d.level === "strategy" ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : d.level === "tactic" ? "bg-amber-50 text-amber-700 border-amber-200"
                      : d.level === "action" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}>
                      {LEVEL_LABELS[d.level] ?? d.level}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{d.label}</div>
                      <div className="text-xs text-gray-400 truncate mt-0.5">{d.sessionTitle}</div>
                    </div>
                    {d.confidence && (
                      <span className="shrink-0 text-xs text-gray-400">{d.confidence}%</span>
                    )}
                    <span className="shrink-0 text-xs text-gray-400">{d.date}</span>
                    <span className="shrink-0 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{d.user}</span>
                    <svg className={`shrink-0 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>

                  {/* 展開部分 */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="pt-3 space-y-3">
                        {/* 説明 */}
                        <p className="text-sm text-gray-600">{d.description}</p>

                        {/* 判断理由 */}
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                          <div className="text-xs font-bold text-blue-700 mb-1">判断理由</div>
                          <p className="text-sm text-blue-900 leading-relaxed">{d.rationale}</p>
                        </div>

                        {/* QCDES影響 */}
                        {d.qcdesImpact && (
                          <div className="flex gap-2 flex-wrap">
                            {d.qcdesImpact.quality && <ImpactBadge label={`Q: ${d.qcdesImpact.quality.description}`} impact={d.qcdesImpact.quality.impact} />}
                            {d.qcdesImpact.cost && <ImpactBadge label={`C: ${d.qcdesImpact.cost.description}`} impact={d.qcdesImpact.cost.impact} />}
                            {d.qcdesImpact.delivery && <ImpactBadge label={`D: ${d.qcdesImpact.delivery.description}`} impact={d.qcdesImpact.delivery.impact} />}
                          </div>
                        )}

                        {/* トレードオフ */}
                        {d.tradeoffs && d.tradeoffs.length > 0 && (
                          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                            <div className="text-xs font-bold text-amber-700 mb-1">トレードオフ</div>
                            {d.tradeoffs.map((t, i) => (
                              <div key={i} className="text-sm text-amber-900">
                                <span className="text-red-600">- {t.give}</span>
                                <span className="mx-2 text-amber-500">{"->"}</span>
                                <span className="text-emerald-700">+ {t.get}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
