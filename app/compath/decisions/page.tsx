"use client"

import { useState, useMemo } from "react"
import "@/styles/compath/index.css"

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
  "sub-action": "詳細",
}

const DEMO_DECISIONS: DecisionEntry[] = [
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
  {
    id: "d-401", sessionId: "sess-005", sessionTitle: "SECC t0.8 めっき鋼板 — 型かじり対策",
    label: "TiCNコーティング＋表面粗さRa0.1μm仕上げ",
    description: "型寿命8万ショットでコスト最適。TD処理より安価。",
    level: "strategy", confidence: 83,
    rationale: "TD処理（寿命10万ショット・40万円）vs TiCN（8万ショット・15万円）。型4本×年2回再処理のトータルコストでTiCNが年間200万円有利。",
    tradeoffs: [{ give: "型寿命が10万→8万ショットに低下", get: "再処理コスト年間200万円削減" }],
    date: "2026-03-28", user: "佐藤 健一",
  },
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

  return (
    <div className="compath-scope" style={{ overflow: "auto" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow">Decision Log</p>
          <h1 style={{ fontSize: "1.6rem", marginBottom: 4 }}>意思決定ログ</h1>
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            {DEMO_DECISIONS.length}件の判断記録 / {ALL_SESSIONS.length}セッション
          </p>
        </div>

        {/* 検索 + フィルター */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="キーワードで検索... (例: 加工硬化、型摩耗、LCC)"
              style={{
                width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                fontSize: "0.9rem", border: "1px solid var(--line)", borderRadius: 12,
                background: "var(--card)", outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
          <select
            value={sessionFilter}
            onChange={e => setSessionFilter(e.target.value)}
            style={{
              fontSize: "0.85rem", border: "1px solid var(--line)", borderRadius: 12,
              padding: "8px 12px", background: "var(--card)", color: "var(--ink)",
              fontFamily: "inherit", cursor: "pointer",
            }}
          >
            <option value="all">全セッション</option>
            {ALL_SESSIONS.map(s => (
              <option key={s.id} value={s.id}>{s.title.split("—")[0].trim()}</option>
            ))}
          </select>
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value)}
            style={{
              fontSize: "0.85rem", border: "1px solid var(--line)", borderRadius: 12,
              padding: "8px 12px", background: "var(--card)", color: "var(--ink)",
              fontFamily: "inherit", cursor: "pointer",
            }}
          >
            <option value="all">全レベル</option>
            {Object.entries(LEVEL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* 件数 */}
        {query || sessionFilter !== "all" || levelFilter !== "all" ? (
          <p className="muted" style={{ fontSize: "0.8rem", marginBottom: 12 }}>
            {filtered.length}件 / {DEMO_DECISIONS.length}件
          </p>
        ) : null}

        {/* リスト */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p className="muted" style={{ fontSize: "1rem" }}>該当する判断記録がありません</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map(d => {
              const isExpanded = expandedId === d.id
              return (
                <div
                  key={d.id}
                  style={{
                    background: "var(--card)",
                    border: `1px solid ${isExpanded ? "var(--accent)" : "var(--line)"}`,
                    borderRadius: 14,
                    transition: "border 0.15s, box-shadow 0.15s",
                    boxShadow: isExpanded ? "var(--shadow)" : "none",
                    cursor: "pointer",
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                >
                  {/* 行 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px" }}>
                    <LevelBadge level={d.level} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {d.label}
                      </div>
                    </div>
                    {d.confidence && (
                      <span className="muted" style={{ fontSize: "0.78rem", flexShrink: 0 }}>{d.confidence}%</span>
                    )}
                    <span className="muted" style={{ fontSize: "0.78rem", flexShrink: 0 }}>{d.date}</span>
                    <span style={{
                      fontSize: "0.75rem", flexShrink: 0,
                      padding: "2px 8px", borderRadius: 999,
                      background: "rgba(31,122,109,0.08)", color: "var(--accent)", fontWeight: 600,
                    }}>{d.user}</span>
                    <svg style={{ flexShrink: 0, color: "var(--muted)", transition: "transform 0.15s", transform: isExpanded ? "rotate(180deg)" : "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>

                  {/* 展開 */}
                  {isExpanded && (
                    <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--line)" }}>
                      <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                        <p className="muted" style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>{d.description}</p>

                        {/* セッション名 */}
                        <p className="muted" style={{ fontSize: "0.78rem" }}>
                          セッション: {d.sessionTitle}
                        </p>

                        {/* 判断理由 */}
                        <div style={{
                          background: "rgba(31,122,109,0.06)", borderRadius: 10,
                          padding: "10px 14px", borderLeft: "3px solid var(--accent)",
                        }}>
                          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>判断理由</div>
                          <p style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>{d.rationale}</p>
                        </div>

                        {/* QCDES */}
                        {d.qcdesImpact && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {d.qcdesImpact.quality && <QcdesBadge axis="Q" impact={d.qcdesImpact.quality.impact} text={d.qcdesImpact.quality.description} />}
                            {d.qcdesImpact.cost && <QcdesBadge axis="C" impact={d.qcdesImpact.cost.impact} text={d.qcdesImpact.cost.description} />}
                            {d.qcdesImpact.delivery && <QcdesBadge axis="D" impact={d.qcdesImpact.delivery.impact} text={d.qcdesImpact.delivery.description} />}
                          </div>
                        )}

                        {/* トレードオフ */}
                        {d.tradeoffs && d.tradeoffs.length > 0 && (
                          <div style={{
                            background: "rgba(224,107,59,0.06)", borderRadius: 10,
                            padding: "10px 14px", borderLeft: "3px solid var(--accent-2)",
                          }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-2)", marginBottom: 4 }}>トレードオフ</div>
                            {d.tradeoffs.map((t, i) => (
                              <p key={i} style={{ fontSize: "0.83rem", lineHeight: 1.5 }}>
                                <span style={{ color: "var(--missing)" }}>- {t.give}</span>
                                <span style={{ margin: "0 6px", color: "var(--muted)" }}>{"-->"}</span>
                                <span style={{ color: "var(--accent)" }}>+ {t.get}</span>
                              </p>
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

// ============================================================
// 小コンポーネント
// ============================================================

function LevelBadge({ level }: { level: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    strategy: { bg: "rgba(31,122,109,0.12)", fg: "var(--accent)" },
    tactic: { bg: "rgba(224,107,59,0.12)", fg: "var(--accent-2)" },
    action: { bg: "rgba(31,28,22,0.08)", fg: "var(--ink)" },
    "sub-action": { bg: "rgba(107,101,92,0.1)", fg: "var(--muted)" },
  }
  const c = colors[level] ?? colors.action
  return (
    <span style={{
      flexShrink: 0, padding: "2px 8px", borderRadius: 999,
      fontSize: "0.72rem", fontWeight: 700,
      background: c.bg, color: c.fg,
    }}>
      {LEVEL_LABELS[level] ?? level}
    </span>
  )
}

function QcdesBadge({ axis, impact, text }: { axis: string; impact: string; text: string }) {
  const icon = impact === "positive" ? "+" : impact === "negative" ? "-" : "="
  const color = impact === "positive" ? "var(--accent)" : impact === "negative" ? "var(--missing)" : "var(--muted)"
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px", borderRadius: 8,
      fontSize: "0.75rem", fontWeight: 500,
      background: "rgba(31,28,22,0.04)",
      border: "1px solid var(--line)",
    }}>
      <span style={{ fontWeight: 700, color }}>{icon}{axis}</span>
      <span className="muted">{text}</span>
    </span>
  )
}
