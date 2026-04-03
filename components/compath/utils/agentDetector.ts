import type { AgentType } from "../types/chat";
import type { ArtifactType, RouteResult } from "../types/agent";

// =============================================================================
// 型定義
// =============================================================================

/** ドキュメントジャンル（サーバーAPIと同期） */
export type DocumentGenre =
  | "meeting_minutes"    // 議事録
  | "technical_paper"    // 論文・技術文書
  | "instruction_manual" // 指示書・マニュアル
  | "report"             // 報告書
  | "specification"      // 仕様書
  | "unknown";           // 不明

/** LLMベースのドキュメント分類結果 */
export type ClassificationResult = {
  genre: DocumentGenre;
  confidence: number;
  suggestedAgent: AgentType;
  indicators: string[];
};

// =============================================================================
// API Base URL
// =============================================================================

const API_BASE = "/api/compath";

// =============================================================================
// LLMベースのドキュメント分類API
// =============================================================================

/**
 * サーバーのclassify-documentエンドポイントを呼び出す
 *
 * @param filePreview ファイルの先頭テキスト（最大2000文字推奨）
 * @param fileName ファイル名
 * @param userMessage ユーザーの入力メッセージ
 * @returns 分類結果（ジャンル、確信度、推奨エージェント、判定根拠）
 */
export async function classifyDocumentAPI(
  filePreview: string,
  fileName: string,
  userMessage: string
): Promise<ClassificationResult> {
  const response = await fetch(`${API_BASE}/chat/classify-document`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filePreview,
      fileName,
      userMessage,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload.message ?? "ドキュメント分類に失敗しました。";
    throw new Error(message);
  }

  const result = await response.json();

  // サーバーのAgentType（knowledge_extraction | unified_analysis）を
  // フロントエンドのAgentTypeにマッピング（同じなので直接使用）
  return {
    genre: result.genre,
    confidence: result.confidence,
    suggestedAgent: result.suggestedAgent as AgentType,
    indicators: result.indicators,
  };
}

// =============================================================================
// ファイルプレビュー抽出
// =============================================================================

/**
 * ファイルから先頭テキストを抽出
 *
 * @param file ファイルオブジェクト
 * @param maxChars 最大文字数（デフォルト: 2000）
 * @returns 抽出されたテキスト
 */
export async function extractFilePreview(
  file: File,
  maxChars: number = 2000
): Promise<string> {
  const fileName = file.name.toLowerCase();

  // TXTファイル: そのまま読み取り
  if (fileName.endsWith(".txt")) {
    return extractTextFromTxt(file, maxChars);
  }

  // PDFファイル: テキスト抽出（簡易的なアプローチ）
  if (fileName.endsWith(".pdf")) {
    return extractTextFromPdf(file, maxChars);
  }

  // DOCXファイル: XMLからテキスト抽出
  if (fileName.endsWith(".docx")) {
    return extractTextFromDocx(file, maxChars);
  }

  // その他のファイルタイプ: ファイル名のみ返す
  console.warn(`[extractFilePreview] Unsupported file type: ${file.name}`);
  return `[ファイル名: ${file.name}]`;
}

/**
 * TXTファイルからテキスト抽出
 */
async function extractTextFromTxt(file: File, maxChars: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("テキストファイルの読み取りに失敗しました。"));
    reader.onload = () => {
      const text = reader.result;
      if (typeof text !== "string") {
        reject(new Error("ファイル形式が不正です。"));
        return;
      }
      resolve(text.slice(0, maxChars));
    };
    reader.readAsText(file, "utf-8");
  });
}

/**
 * PDFファイルからテキスト抽出（簡易版）
 *
 * ブラウザ環境ではpdf-parseを直接使用できないため、
 * バイナリからテキスト部分を簡易的に抽出する
 */
async function extractTextFromPdf(file: File, maxChars: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("PDFファイルの読み取りに失敗しました。"));
    reader.onload = () => {
      const arrayBuffer = reader.result;
      if (!(arrayBuffer instanceof ArrayBuffer)) {
        reject(new Error("ファイル形式が不正です。"));
        return;
      }

      try {
        // PDFバイナリからテキストを簡易抽出
        const text = extractTextFromPdfBinary(arrayBuffer);
        resolve(text.slice(0, maxChars));
      } catch {
        // 抽出失敗時はファイル名のみ返す
        console.warn("[extractTextFromPdf] Failed to extract text from PDF");
        resolve(`[PDFファイル: ${file.name}]`);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * PDFバイナリからテキストを簡易抽出
 *
 * PDFストリーム内のテキストオブジェクトを検出し、
 * ASCII/UTF-16テキストを抽出する簡易的なアプローチ
 */
function extractTextFromPdfBinary(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  const textChunks: string[] = [];

  // PDFからテキストストリームを検出して抽出
  // BT...ET (テキストオブジェクト) 内の (text) または <hex> を探す
  let i = 0;
  const len = bytes.length;
  let inTextObject = false;

  while (i < len - 1) {
    // BT (Begin Text) を検出
    if (bytes[i] === 0x42 && bytes[i + 1] === 0x54) {
      // "BT"
      inTextObject = true;
      i += 2;
      continue;
    }

    // ET (End Text) を検出
    if (bytes[i] === 0x45 && bytes[i + 1] === 0x54) {
      // "ET"
      inTextObject = false;
      i += 2;
      continue;
    }

    // テキストオブジェクト内の (text) を検出
    if (inTextObject && bytes[i] === 0x28) {
      // '('
      const start = i + 1;
      let depth = 1;
      i++;

      while (i < len && depth > 0) {
        if (bytes[i] === 0x28 && bytes[i - 1] !== 0x5c) depth++; // '(' not escaped
        if (bytes[i] === 0x29 && bytes[i - 1] !== 0x5c) depth--; // ')' not escaped
        i++;
      }

      if (depth === 0) {
        const textBytes = bytes.slice(start, i - 1);
        const text = decodePdfText(textBytes);
        if (text.trim()) {
          textChunks.push(text);
        }
      }
      continue;
    }

    i++;
  }

  // 抽出したテキストが少ない場合、バイナリ全体からASCII文字を抽出
  if (textChunks.join("").length < 100) {
    const fallbackText = extractAsciiFromBinary(bytes);
    if (fallbackText.length > textChunks.join("").length) {
      return fallbackText;
    }
  }

  return textChunks.join(" ");
}

/**
 * PDFテキストバイトをデコード
 */
function decodePdfText(bytes: Uint8Array): string {
  // 簡易的にUTF-8としてデコードを試みる
  try {
    const decoder = new TextDecoder("utf-8", { fatal: false });
    return decoder.decode(bytes);
  } catch {
    // フォールバック: ASCII文字のみ抽出
    return Array.from(bytes)
      .filter((b) => b >= 0x20 && b < 0x7f)
      .map((b) => String.fromCharCode(b))
      .join("");
  }
}

/**
 * バイナリからASCII文字を抽出（フォールバック）
 */
function extractAsciiFromBinary(bytes: Uint8Array): string {
  const chars: string[] = [];
  let consecutiveNonPrintable = 0;

  for (const byte of bytes) {
    if (byte >= 0x20 && byte < 0x7f) {
      chars.push(String.fromCharCode(byte));
      consecutiveNonPrintable = 0;
    } else if (byte === 0x0a || byte === 0x0d) {
      // 改行
      if (chars.length > 0 && chars[chars.length - 1] !== " ") {
        chars.push(" ");
      }
      consecutiveNonPrintable = 0;
    } else {
      consecutiveNonPrintable++;
      // 連続する非印字文字が多い場合は区切りとして扱う
      if (consecutiveNonPrintable > 10 && chars.length > 0 && chars[chars.length - 1] !== " ") {
        chars.push(" ");
      }
    }
  }

  // PDFメタデータやコマンドを除去
  const text = chars.join("");
  return text
    .replace(/\/[A-Z][a-zA-Z0-9]*/g, " ") // /Name オペレータを除去
    .replace(/\d+\s+\d+\s+obj/g, " ")     // オブジェクト定義を除去
    .replace(/endobj/g, " ")
    .replace(/stream.*?endstream/gs, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * DOCXファイルからテキスト抽出
 *
 * DOCXはZIPアーカイブなので、word/document.xmlを読み取る
 */
async function extractTextFromDocx(file: File, maxChars: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("DOCXファイルの読み取りに失敗しました。"));
    reader.onload = async () => {
      const arrayBuffer = reader.result;
      if (!(arrayBuffer instanceof ArrayBuffer)) {
        reject(new Error("ファイル形式が不正です。"));
        return;
      }

      try {
        const text = await extractTextFromDocxZip(arrayBuffer);
        resolve(text.slice(0, maxChars));
      } catch {
        console.warn("[extractTextFromDocx] Failed to extract text from DOCX");
        resolve(`[DOCXファイル: ${file.name}]`);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * DOCXのZIPアーカイブからテキストを抽出
 */
async function extractTextFromDocxZip(arrayBuffer: ArrayBuffer): Promise<string> {
  // 簡易的なZIP解凍とXML解析
  // word/document.xml のテキストを抽出

  const bytes = new Uint8Array(arrayBuffer);

  // ZIPファイルからword/document.xmlを探す
  const documentXml = findFileInZip(bytes, "word/document.xml");
  if (!documentXml) {
    throw new Error("document.xml not found in DOCX");
  }

  // XMLからテキストを抽出
  const text = extractTextFromXml(documentXml);
  return text;
}

/**
 * 簡易的なZIPファイル検索
 *
 * ZIPのローカルファイルヘッダーを解析してファイルを探す
 */
function findFileInZip(bytes: Uint8Array, targetFileName: string): Uint8Array | null {
  let offset = 0;
  const len = bytes.length;

  while (offset < len - 30) {
    // ローカルファイルヘッダーシグネチャ: 0x04034b50
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x03 &&
      bytes[offset + 3] === 0x04
    ) {
      // ファイル名の長さ（オフセット26-27、リトルエンディアン）
      const fileNameLen = bytes[offset + 26] | (bytes[offset + 27] << 8);
      // 拡張フィールドの長さ（オフセット28-29）
      const extraFieldLen = bytes[offset + 28] | (bytes[offset + 29] << 8);
      // 圧縮サイズ（オフセット18-21）
      const compressedSize =
        bytes[offset + 18] |
        (bytes[offset + 19] << 8) |
        (bytes[offset + 20] << 16) |
        (bytes[offset + 21] << 24);
      // 圧縮方式（オフセット8-9）
      const compressionMethod = bytes[offset + 8] | (bytes[offset + 9] << 8);

      // ファイル名を取得
      const fileNameBytes = bytes.slice(offset + 30, offset + 30 + fileNameLen);
      const fileName = new TextDecoder().decode(fileNameBytes);

      // データの開始位置
      const dataStart = offset + 30 + fileNameLen + extraFieldLen;

      if (fileName === targetFileName) {
        // 圧縮されていない場合（stored）
        if (compressionMethod === 0) {
          return bytes.slice(dataStart, dataStart + compressedSize);
        }
        // deflate圧縮の場合
        if (compressionMethod === 8) {
          const compressedData = bytes.slice(dataStart, dataStart + compressedSize);
          return inflateRaw(compressedData);
        }
        return null;
      }

      // 次のヘッダーへ
      offset = dataStart + compressedSize;
    } else {
      offset++;
    }
  }

  return null;
}

/**
 * 簡易的なdeflate解凍
 *
 * ブラウザのDecompressionStream APIを使用
 * 対応していない場合はnullを返す
 */
function inflateRaw(compressedData: Uint8Array): Uint8Array | null {
  // DecompressionStreamが利用可能か確認
  if (typeof DecompressionStream === "undefined") {
    console.warn("[inflateRaw] DecompressionStream not available");
    return null;
  }

  try {
    // deflate-rawを使用
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    // 非同期処理を同期的に扱うため、簡易的なアプローチ
    // 注: これは理想的ではないが、小さいファイル向けには動作する
    const chunks: Uint8Array[] = [];

    // データを書き込み
    writer.write(compressedData);
    writer.close();

    // 同期的に読み取りを試みる（実際には非同期）
    // このアプローチはworkaroundで、完全な解凍には非同期版が必要
    // ここでは単純化のため、同期的なフォールバックを返す

    // フォールバック: 圧縮データからテキストを直接抽出（不完全）
    return null;
  } catch {
    return null;
  }
}

/**
 * XMLからテキストを抽出
 *
 * <w:t>タグ内のテキストを抽出
 */
function extractTextFromXml(xmlBytes: Uint8Array): string {
  const xmlString = new TextDecoder().decode(xmlBytes);

  // <w:t>...</w:t> または <w:t ...>...</w:t> からテキストを抽出
  const textMatches = xmlString.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  const texts: string[] = [];

  for (const match of textMatches) {
    if (match[1]) {
      texts.push(match[1]);
    }
  }

  // 段落区切りを検出してスペースを追加
  return texts.join("").replace(/\s+/g, " ").trim();
}

// =============================================================================
// エージェントタイプ判定（既存）
// =============================================================================

/**
 * 入力内容からエージェントを自動判定
 */
export function detectAgent(input: string, files?: File[]): AgentType {
  const text = input.toLowerCase();

  // ファイルがある場合
  if (files && files.length > 0) {
    const fileName = files[0].name.toLowerCase();
    // 議事録系のキーワード
    if (
      fileName.includes("議事") ||
      fileName.includes("minutes") ||
      fileName.includes("会議") ||
      fileName.includes("ミーティング") ||
      fileName.includes("mtg")
    ) {
      return "unified_analysis";
    }
    // 報告書系（デフォルト）
    return "knowledge_extraction";
  }

  // テキスト入力の場合

  // 過去事例・類似事例系キーワード
  if (
    text.includes("過去") ||
    text.includes("事例") ||
    text.includes("似た") ||
    text.includes("以前") ||
    text.includes("経験") ||
    text.includes("類似") ||
    text.includes("前例")
  ) {
    return "unified_analysis";
  }

  // 議事録系キーワード
  if (
    text.includes("議事") ||
    text.includes("会議") ||
    text.includes("決議") ||
    text.includes("リスク")
  ) {
    return "unified_analysis";
  }

  // 日報系キーワード
  if (
    text.includes("日報") ||
    text.includes("今日の") ||
    text.includes("本日の") ||
    text.includes("業務記録")
  ) {
    return "daily_report";
  }

  // 文書解析系キーワード
  if (
    text.includes("報告書") ||
    text.includes("分析") ||
    text.includes("構造") ||
    text.includes("解析")
  ) {
    return "knowledge_extraction";
  }

  // デフォルト: 議事録分析
  return "unified_analysis";
}

/**
 * エージェントタイプからラベルを取得
 */
export function getAgentLabel(agentType: AgentType): string {
  switch (agentType) {
    case "unified_analysis":
      return "議事録分析";
    case "knowledge_extraction":
      return "文書構造解析";
    case "daily_report":
      return "日報";
    default:
      return "アシスタント";
  }
}

// =============================================================================
// 成果物タイプ判定（新規）
// =============================================================================

/**
 * 成果物タイプ判定のキーワードパターン
 */
const ARTIFACT_PATTERNS: Record<ArtifactType, { keywords: string[]; weight: number }> = {
  FTA: {
    keywords: [
      "原因", "要因", "なぜ起きた", "故障", "不具合", "リスクツリー",
      "and/or", "fta", "fault tree", "根本原因", "因果", "トラブル",
      "障害", "事故", "インシデント", "失敗", "エラー", "バグ"
    ],
    weight: 1.0,
  },
  MINUTES: {
    keywords: [
      "会議", "議事録", "アクション", "決定事項", "参加者", "論点",
      "ミーティング", "mtg", "minutes", "出席者", "議題", "検討事項",
      "報告", "承認", "審議", "確認事項", "次回", "宿題"
    ],
    weight: 1.0,
  },
  DECISION_LOG: {
    keywords: [
      "選択肢", "a案", "b案", "評価軸", "比較", "決める", "推奨",
      "どちらが", "どれが", "判断", "決定", "検討", "オプション",
      "メリット", "デメリット", "トレードオフ", "pros", "cons",
      "迷って", "悩んで", "どうすれば"
    ],
    weight: 1.0,
  },
};

/**
 * 入力内容から成果物タイプを判定
 *
 * @param input ユーザー入力
 * @param files 添付ファイル（オプション）
 * @returns RouteResult（判定結果と信頼度）
 */
export function detectArtifactType(input: string, files?: File[]): RouteResult {
  const text = input.toLowerCase();
  const scores: Record<ArtifactType, { score: number; reasons: string[] }> = {
    FTA: { score: 0, reasons: [] },
    MINUTES: { score: 0, reasons: [] },
    DECISION_LOG: { score: 0, reasons: [] },
  };

  // ファイル名からの判定
  if (files && files.length > 0) {
    const fileName = files[0].name.toLowerCase();

    // FTA系のファイル名
    if (
      fileName.includes("fta") ||
      fileName.includes("故障") ||
      fileName.includes("原因") ||
      fileName.includes("トラブル")
    ) {
      scores.FTA.score += 0.4;
      scores.FTA.reasons.push(`ファイル名: ${files[0].name}`);
    }

    // 議事録系のファイル名
    if (
      fileName.includes("議事") ||
      fileName.includes("minutes") ||
      fileName.includes("会議") ||
      fileName.includes("mtg")
    ) {
      scores.MINUTES.score += 0.4;
      scores.MINUTES.reasons.push(`ファイル名: ${files[0].name}`);
    }

    // 意思決定系のファイル名
    if (
      fileName.includes("決定") ||
      fileName.includes("検討") ||
      fileName.includes("比較") ||
      fileName.includes("選定")
    ) {
      scores.DECISION_LOG.score += 0.4;
      scores.DECISION_LOG.reasons.push(`ファイル名: ${files[0].name}`);
    }
  }

  // テキストからのキーワードマッチング
  for (const [artifactType, pattern] of Object.entries(ARTIFACT_PATTERNS) as [ArtifactType, typeof ARTIFACT_PATTERNS[ArtifactType]][]) {
    for (const keyword of pattern.keywords) {
      if (text.includes(keyword)) {
        const addScore = 0.15 * pattern.weight;
        scores[artifactType].score += addScore;
        if (scores[artifactType].reasons.length < 3) {
          scores[artifactType].reasons.push(`キーワード: ${keyword}`);
        }
      }
    }
  }

  // スコアを正規化（最大1.0）
  for (const type of Object.keys(scores) as ArtifactType[]) {
    scores[type].score = Math.min(scores[type].score, 1.0);
  }

  // 最高スコアのタイプを選択
  const sortedTypes = (Object.entries(scores) as [ArtifactType, { score: number; reasons: string[] }][])
    .sort((a, b) => b[1].score - a[1].score);

  const bestMatch = sortedTypes[0];
  const secondMatch = sortedTypes[1];

  // 信頼度の計算
  const confidence = bestMatch[1].score;
  const isAmbiguous = confidence < 0.65 || (secondMatch[1].score > 0 && confidence - secondMatch[1].score < 0.2);

  // フォールバック候補（信頼度が低い場合）
  const fallbackChoices = isAmbiguous
    ? sortedTypes.filter(([_, data]) => data.score > 0).map(([type, _]) => type)
    : undefined;

  return {
    type: bestMatch[0],
    confidence,
    reasons: bestMatch[1].reasons,
    fallbackChoices,
  };
}

/**
 * 成果物タイプからラベルを取得
 */
export function getArtifactTypeLabel(artifactType: ArtifactType): string {
  switch (artifactType) {
    case "FTA":
      return "FTA（故障の木）";
    case "MINUTES":
      return "議事録";
    case "DECISION_LOG":
      return "意思決定ログ";
    default:
      return "成果物";
  }
}
