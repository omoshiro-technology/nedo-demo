/**
 * モック認証サービス
 *
 * 開発・テスト用の認証サービス実装
 * AUTH_MODE=disabled 時に使用
 */

import type { IAuthenticationService } from "../../domain/auth/IAuthenticationService";
import type {
  AuthenticatedUser,
  OIDCConfiguration,
  JsonWebKeySet,
} from "../../domain/auth/types";

// ============================================================
// モック認証サービス
// ============================================================

/**
 * モック認証サービス
 *
 * 開発環境では常に固定のダミーユーザーを返す
 * テスト時には任意のユーザー情報を設定可能
 */
export class MockAuthenticationService implements IAuthenticationService {
  private mockUser: AuthenticatedUser;

  constructor(options?: MockAuthenticationOptions) {
    this.mockUser = options?.defaultUser ?? DEFAULT_MOCK_USER;
  }

  /**
   * トークンを検証（モック: 常に成功）
   */
  async validateToken(token: string): Promise<AuthenticatedUser | null> {
    // 特殊なトークンで認証失敗をシミュレート
    if (token === "INVALID_TOKEN") {
      return null;
    }
    if (token === "EXPIRED_TOKEN") {
      return null;
    }

    // それ以外は常にモックユーザーを返す
    return {
      ...this.mockUser,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
  }

  /**
   * トークンをリフレッシュ（モック: 常に成功）
   */
  async refreshToken(refreshToken: string): Promise<string | null> {
    if (refreshToken === "INVALID_REFRESH_TOKEN") {
      return null;
    }
    return "mock-access-token-" + Date.now();
  }

  /**
   * OIDC Discovery（モック: 未サポート）
   */
  async discoverConfiguration(issuer: string): Promise<OIDCConfiguration> {
    throw new Error(
      "MockAuthenticationService does not support OIDC Discovery. " +
      "Use OIDCAuthenticationService for production."
    );
  }

  /**
   * JWKS 取得（モック: 未サポート）
   */
  async getJwks(jwksUri: string): Promise<JsonWebKeySet> {
    throw new Error(
      "MockAuthenticationService does not support JWKS. " +
      "Use OIDCAuthenticationService for production."
    );
  }

  /**
   * トークン有効期限確認（モック: 常に有効）
   */
  isTokenExpired(token: string): boolean {
    return token === "EXPIRED_TOKEN";
  }

  /**
   * トークンデコード（モック: ダミーペイロード）
   */
  decodeToken(token: string): Record<string, unknown> | null {
    if (token === "INVALID_TOKEN") {
      return null;
    }
    return {
      sub: this.mockUser.sub,
      email: this.mockUser.email,
      name: this.mockUser.name,
      tid: this.mockUser.tenantId,
      roles: this.mockUser.roles,
    };
  }

  // ============================================================
  // テスト用メソッド
  // ============================================================

  /**
   * モックユーザーを設定
   */
  setMockUser(user: Partial<AuthenticatedUser>): void {
    this.mockUser = {
      ...this.mockUser,
      ...user,
    };
  }

  /**
   * モックユーザーをリセット
   */
  resetMockUser(): void {
    this.mockUser = DEFAULT_MOCK_USER;
  }

  /**
   * 現在のモックユーザーを取得
   */
  getMockUser(): AuthenticatedUser {
    return { ...this.mockUser };
  }
}

// ============================================================
// 設定・定数
// ============================================================

/**
 * モック認証サービス設定
 */
export type MockAuthenticationOptions = {
  /** デフォルトのモックユーザー */
  defaultUser?: AuthenticatedUser;
};

/**
 * デフォルトのモックユーザー
 */
export const DEFAULT_MOCK_USER: AuthenticatedUser = {
  sub: "dev-user-001",
  email: "dev@example.com",
  emailVerified: true,
  name: "開発ユーザー",
  givenName: "開発",
  familyName: "ユーザー",
  tenantId: "dev-tenant",
  roles: ["admin"],
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400, // 24時間
  iss: "http://localhost:3001",
  aud: "compath-api",
};

/**
 * テスト用モックユーザーのプリセット
 */
export const MOCK_USERS = {
  admin: {
    ...DEFAULT_MOCK_USER,
    sub: "admin-user-001",
    email: "admin@example.com",
    name: "管理者ユーザー",
    roles: ["admin"] as const,
  },
  editor: {
    ...DEFAULT_MOCK_USER,
    sub: "editor-user-001",
    email: "editor@example.com",
    name: "編集者ユーザー",
    roles: ["editor"] as const,
  },
  viewer: {
    ...DEFAULT_MOCK_USER,
    sub: "viewer-user-001",
    email: "viewer@example.com",
    name: "閲覧者ユーザー",
    roles: ["viewer"] as const,
  },
} as const;
