/**
 * HTTPリクエストのバリデーションとサニタイズユーティリティ
 */

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Base64文字列からdata:プレフィックスを除去
 */
export function normalizeBase64(value: string): string {
  const commaIndex = value.indexOf(",");
  return commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
}

/**
 * Base64文字列のデコード後サイズを推定
 */
export function estimateBase64Size(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * ファイルサイズの検証結果
 */
export type FileSizeValidation = {
  valid: boolean;
  byteSize: number;
  error?: string;
};

/**
 * Base64ファイルのサイズを検証
 */
export function validateFileSize(base64: string, maxBytes = MAX_FILE_SIZE_BYTES): FileSizeValidation {
  const normalized = normalizeBase64(base64);
  const byteSize = estimateBase64Size(normalized);

  if (byteSize > maxBytes) {
    const maxMb = Math.floor(maxBytes / (1024 * 1024));
    return {
      valid: false,
      byteSize,
      error: `ファイルサイズが${maxMb}MBを超えています。`
    };
  }

  return { valid: true, byteSize };
}

/**
 * Base64文字列の形式を検証
 */
export function validateBase64Format(base64: string): { valid: boolean; error?: string } {
  if (!base64 || typeof base64 !== "string") {
    return { valid: false, error: "base64データが必要です。" };
  }

  const normalized = normalizeBase64(base64);

  // Base64の文字として有効かチェック（A-Z, a-z, 0-9, +, /, =）
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(normalized)) {
    return { valid: false, error: "不正なbase64形式です。" };
  }

  // 空でないことを確認
  if (normalized.length === 0) {
    return { valid: false, error: "base64データが空です。" };
  }

  return { valid: true };
}

/**
 * Content-Dispositionヘッダ用にファイル名をサニタイズ
 * RFC 5987に準拠したエンコーディング
 */
export function sanitizeFileName(fileName: string): string {
  // 危険な文字を除去
  const sanitized = fileName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_") // 制御文字とファイル名に使えない文字を置換
    .replace(/\.\./g, "_") // パストラバーサル防止
    .replace(/^\.+/, "") // 先頭のドットを除去
    .trim();

  // 空になった場合はデフォルト名を返す
  if (!sanitized) {
    return "download";
  }

  // 長すぎる場合は切り詰める
  if (sanitized.length > 200) {
    const ext = sanitized.includes(".") ? sanitized.slice(sanitized.lastIndexOf(".")) : "";
    const name = sanitized.slice(0, 200 - ext.length);
    return name + ext;
  }

  return sanitized;
}

/**
 * Content-Dispositionヘッダ値を生成
 * ASCII以外の文字はRFC 5987形式でエンコード
 */
export function buildContentDisposition(fileName: string, type: "attachment" | "inline" = "attachment"): string {
  const sanitized = sanitizeFileName(fileName);

  // ASCII文字のみかチェック
  const isAscii = /^[\x20-\x7E]+$/.test(sanitized);

  if (isAscii) {
    // ASCIIのみならシンプルな形式
    return `${type}; filename="${sanitized}"`;
  }

  // 非ASCII文字を含む場合はRFC 5987形式でエンコード
  const encoded = encodeURIComponent(sanitized).replace(/'/g, "%27");
  return `${type}; filename="${sanitized.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encoded}`;
}

/**
 * MIMEタイプの検証
 */
export function validateMimeType(
  mimeType: string,
  allowedTypes?: string[]
): { valid: boolean; error?: string } {
  if (!mimeType || typeof mimeType !== "string") {
    return { valid: false, error: "mimeTypeが必要です。" };
  }

  // 基本的な形式チェック
  if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._+-]+$/.test(mimeType)) {
    return { valid: false, error: "不正なmimeType形式です。" };
  }

  // 許可リストがある場合はチェック
  if (allowedTypes && allowedTypes.length > 0) {
    const isAllowed = allowedTypes.some((allowed) => {
      if (allowed.endsWith("/*")) {
        // ワイルドカード（例: application/*）
        const prefix = allowed.slice(0, -1);
        return mimeType.startsWith(prefix);
      }
      return mimeType === allowed;
    });

    if (!isAllowed) {
      return { valid: false, error: `許可されていないファイル形式です: ${mimeType}` };
    }
  }

  return { valid: true };
}

/**
 * 複数ファイルの一括バリデーション
 */
export type FileValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateFiles(
  files: Array<{ fileName: string; mimeType: string; base64: string }>,
  options: {
    maxFiles?: number;
    maxFileSize?: number;
    allowedMimeTypes?: string[];
  } = {}
): FileValidationResult {
  const errors: string[] = [];
  const { maxFiles = 20, maxFileSize = MAX_FILE_SIZE_BYTES, allowedMimeTypes } = options;

  if (!files || !Array.isArray(files)) {
    return { valid: false, errors: ["ファイル配列が必要です。"] };
  }

  if (files.length === 0) {
    return { valid: false, errors: ["1つ以上のファイルが必要です。"] };
  }

  if (files.length > maxFiles) {
    return { valid: false, errors: [`一度に処理できるファイルは${maxFiles}件までです。`] };
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const prefix = `ファイル${i + 1}`;

    if (!file) {
      errors.push(`${prefix}: ファイルデータがありません。`);
      continue;
    }

    if (!file.fileName || typeof file.fileName !== "string") {
      errors.push(`${prefix}: fileNameが必要です。`);
    }

    const mimeValidation = validateMimeType(file.mimeType, allowedMimeTypes);
    if (!mimeValidation.valid) {
      errors.push(`${prefix}: ${mimeValidation.error}`);
    }

    const base64Validation = validateBase64Format(file.base64);
    if (!base64Validation.valid) {
      errors.push(`${prefix}: ${base64Validation.error}`);
    } else {
      const sizeValidation = validateFileSize(file.base64, maxFileSize);
      if (!sizeValidation.valid) {
        errors.push(`${prefix}: ${sizeValidation.error}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
