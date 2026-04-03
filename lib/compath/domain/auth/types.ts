/**
 * 認証・認可ドメイン型
 *
 * OpenID Connect (OIDC) 準拠
 * エンタープライズ IdP (EntraID, Okta, Auth0等) との連携を想定
 */

// ============================================================
// ユーザー・認証関連
// ============================================================

/** ユーザーロール */
export type UserRole = "admin" | "editor" | "viewer";

/**
 * 認証済みユーザー情報（OIDC標準クレーム）
 *
 * @see https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
 */
export type AuthenticatedUser = {
  /** サブジェクト識別子（IdPが発行するユニークID） */
  sub: string;

  /** メールアドレス */
  email: string;

  /** メールアドレス検証済みか */
  emailVerified?: boolean;

  /** 表示名 */
  name?: string;

  /** 名 */
  givenName?: string;

  /** 姓 */
  familyName?: string;

  /** テナントID（マルチテナント対応） */
  tenantId: string;

  /** ロール */
  roles: UserRole[];

  /** トークン発行時刻 (Unix timestamp) */
  iat: number;

  /** トークン有効期限 (Unix timestamp) */
  exp: number;

  /** 発行者（IdP識別子） */
  iss: string;

  /** 対象オーディエンス */
  aud?: string | string[];

  /** カスタムクレーム（IdP固有の追加情報） */
  customClaims?: Record<string, unknown>;
};

/**
 * 認証コンテキスト（リクエストに付与）
 */
export type AuthContext = {
  /** 認証済みユーザー */
  user: AuthenticatedUser;

  /** テナントID（ユーザーから抽出） */
  tenantId: string;

  /** 付与されたスコープ */
  scopes: string[];

  /** 認証方法 */
  authMethod: AuthMethod;

  /** トークン情報 */
  tokenInfo: {
    /** トークンID (jti) */
    jti?: string;
    /** 発行時刻 */
    issuedAt: Date;
    /** 有効期限 */
    expiresAt: Date;
  };
};

/** 認証方法 */
export type AuthMethod =
  | "bearer_token"      // Bearer JWT
  | "api_key"           // API Key (将来用)
  | "session_cookie"    // Session Cookie (将来用)
  | "mock";             // 開発用モック

// ============================================================
// OIDC 設定関連
// ============================================================

/**
 * OIDC Discovery 設定
 *
 * @see https://openid.net/specs/openid-connect-discovery-1_0.html
 */
export type OIDCConfiguration = {
  /** 発行者URL */
  issuer: string;

  /** 認可エンドポイント */
  authorization_endpoint: string;

  /** トークンエンドポイント */
  token_endpoint: string;

  /** ユーザー情報エンドポイント */
  userinfo_endpoint: string;

  /** JWKS URI */
  jwks_uri: string;

  /** サポートするスコープ */
  scopes_supported: string[];

  /** サポートするレスポンスタイプ */
  response_types_supported: string[];

  /** ID トークンの署名アルゴリズム */
  id_token_signing_alg_values_supported: string[];

  /** サポートするクレーム */
  claims_supported?: string[];

  /** サポートする認証方法 */
  token_endpoint_auth_methods_supported?: string[];
};

/**
 * JSON Web Key Set
 */
export type JsonWebKeySet = {
  keys: JsonWebKey[];
};

/**
 * JSON Web Key
 */
export type JsonWebKey = {
  /** キータイプ (RSA, EC等) */
  kty: string;

  /** 用途 (sig, enc) */
  use?: string;

  /** キーID */
  kid?: string;

  /** アルゴリズム */
  alg?: string;

  /** RSA: 公開指数 */
  n?: string;

  /** RSA: モジュラス */
  e?: string;

  /** X.509 証明書チェーン */
  x5c?: string[];

  /** X.509 証明書 SHA-1 サムプリント */
  x5t?: string;

  /** X.509 証明書 SHA-256 サムプリント */
  "x5t#S256"?: string;
};

// ============================================================
// 認証設定
// ============================================================

/** 認証モード */
export type AuthMode = "required" | "optional" | "disabled";

/** テナントID抽出方法 */
export type TenantExtraction = "claim" | "header" | "subdomain";

/**
 * 認証設定
 */
export type AuthConfig = {
  /** 認証モード */
  mode: AuthMode;

  /** OIDC 発行者URL */
  issuer?: string;

  /** クライアントID */
  clientId?: string;

  /** 許可するオーディエンス */
  audience?: string;

  /** JWKS キャッシュTTL (秒) */
  jwksCacheTtl: number;

  /** テナントID抽出方法 */
  tenantExtraction: TenantExtraction;

  /** テナントIDクレーム名 */
  tenantClaimName: string;

  /** ロールクレーム名 */
  roleClaimName: string;
};

/**
 * デフォルト認証設定
 */
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  mode: "disabled",
  jwksCacheTtl: 3600,
  tenantExtraction: "claim",
  tenantClaimName: "tid",
  roleClaimName: "roles",
};

// ============================================================
// リソースタイプ（認可用）
// ============================================================

/** リソースタイプ */
export type ResourceType =
  | "session"
  | "history"
  | "knowledge"
  | "execution_result"
  | "heuristic"
  | "pattern"
  | "export";

/** リソースアクション */
export type ResourceAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "list"
  | "export"
  | "import";
