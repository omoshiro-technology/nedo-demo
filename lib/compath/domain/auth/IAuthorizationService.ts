/**
 * 認可サービスインターフェース
 *
 * リソースベースのアクセス制御を提供
 * RBAC (Role-Based Access Control) とリソースオーナーシップを組み合わせた認可モデル
 */

import type {
  AuthenticatedUser,
  UserRole,
  ResourceType,
  ResourceAction,
} from "./types";

// ============================================================
// 認可サービスインターフェース
// ============================================================

/**
 * 認可サービスインターフェース
 */
export interface IAuthorizationService {
  // ============================================================
  // リソース別アクセス制御
  // ============================================================

  /**
   * セッションへのアクセス権限を確認
   *
   * @param user 認証済みユーザー
   * @param sessionId セッションID
   * @param action 実行するアクション
   * @returns アクセス可能かどうか
   */
  canAccessSession(
    user: AuthenticatedUser,
    sessionId: string,
    action: ResourceAction
  ): Promise<AuthorizationResult>;

  /**
   * 分析履歴へのアクセス権限を確認
   *
   * @param user 認証済みユーザー
   * @param historyId 履歴ID
   * @param action 実行するアクション
   * @returns アクセス可能かどうか
   */
  canAccessHistory(
    user: AuthenticatedUser,
    historyId: string,
    action: ResourceAction
  ): Promise<AuthorizationResult>;

  /**
   * ナレッジベースへのアクセス権限を確認
   *
   * @param user 認証済みユーザー
   * @param tenantId テナントID
   * @param action 実行するアクション
   * @returns アクセス可能かどうか
   */
  canAccessKnowledge(
    user: AuthenticatedUser,
    tenantId: string,
    action: ResourceAction
  ): Promise<AuthorizationResult>;

  // ============================================================
  // 汎用アクセス制御
  // ============================================================

  /**
   * リソースへのアクセス権限を確認（汎用）
   *
   * @param user 認証済みユーザー
   * @param resourceType リソースタイプ
   * @param resourceId リソースID（nullの場合は新規作成）
   * @param action 実行するアクション
   * @returns アクセス可能かどうか
   */
  canAccess(
    user: AuthenticatedUser,
    resourceType: ResourceType,
    resourceId: string | null,
    action: ResourceAction
  ): Promise<AuthorizationResult>;

  // ============================================================
  // ロール・スコープ確認
  // ============================================================

  /**
   * 必要なロールを持っているか確認
   *
   * @param user 認証済みユーザー
   * @param requiredRole 必要なロール
   * @returns ロールを持っているかどうか
   */
  hasRole(user: AuthenticatedUser, requiredRole: UserRole): boolean;

  /**
   * 必要なロールのいずれかを持っているか確認
   *
   * @param user 認証済みユーザー
   * @param requiredRoles 必要なロール（OR条件）
   * @returns いずれかのロールを持っているかどうか
   */
  hasAnyRole(user: AuthenticatedUser, requiredRoles: UserRole[]): boolean;

  /**
   * 必要なスコープを持っているか確認
   *
   * @param scopes 付与されたスコープ
   * @param requiredScope 必要なスコープ
   * @returns スコープを持っているかどうか
   */
  hasScope(scopes: string[], requiredScope: string): boolean;

  /**
   * 必要なスコープ全てを持っているか確認
   *
   * @param scopes 付与されたスコープ
   * @param requiredScopes 必要なスコープ（AND条件）
   * @returns 全てのスコープを持っているかどうか
   */
  hasAllScopes(scopes: string[], requiredScopes: string[]): boolean;

  // ============================================================
  // テナント確認
  // ============================================================

  /**
   * ユーザーが指定テナントに所属しているか確認
   *
   * @param user 認証済みユーザー
   * @param tenantId 確認するテナントID
   * @returns 所属しているかどうか
   */
  belongsToTenant(user: AuthenticatedUser, tenantId: string): boolean;
}

// ============================================================
// 認可結果
// ============================================================

/** 認可結果 */
export type AuthorizationResult =
  | { allowed: true }
  | { allowed: false; reason: AuthorizationDenialReason };

/** 認可拒否理由 */
export type AuthorizationDenialReason = {
  code: AuthorizationErrorCode;
  message: string;
  requiredRole?: UserRole;
  requiredScope?: string;
  resourceType?: ResourceType;
  resourceId?: string;
};

/** 認可エラーコード */
export type AuthorizationErrorCode =
  | "INSUFFICIENT_ROLE"       // ロール不足
  | "INSUFFICIENT_SCOPE"      // スコープ不足
  | "TENANT_MISMATCH"         // テナント不一致
  | "RESOURCE_NOT_FOUND"      // リソースが存在しない
  | "NOT_RESOURCE_OWNER"      // リソースオーナーではない
  | "ACTION_NOT_ALLOWED"      // アクションが許可されていない
  | "RESOURCE_LOCKED"         // リソースがロックされている
  | "UNKNOWN_ERROR";          // 不明なエラー

// ============================================================
// ロール権限マトリックス
// ============================================================

/**
 * ロール別デフォルト権限
 *
 * admin: 全操作可能
 * editor: 作成・読取・更新可能、削除は自分のリソースのみ
 * viewer: 読取のみ
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  UserRole,
  Record<ResourceAction, boolean>
> = {
  admin: {
    create: true,
    read: true,
    update: true,
    delete: true,
    list: true,
    export: true,
    import: true,
  },
  editor: {
    create: true,
    read: true,
    update: true,
    delete: false, // 自分のリソースのみ（要オーナーシップ確認）
    list: true,
    export: true,
    import: false,
  },
  viewer: {
    create: false,
    read: true,
    update: false,
    delete: false,
    list: true,
    export: true,
    import: false,
  },
};

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * 認可結果を作成（許可）
 */
export function allowed(): AuthorizationResult {
  return { allowed: true };
}

/**
 * 認可結果を作成（拒否）
 */
export function denied(reason: AuthorizationDenialReason): AuthorizationResult {
  return { allowed: false, reason };
}

/**
 * ロール不足エラーを作成
 */
export function insufficientRole(requiredRole: UserRole): AuthorizationResult {
  return denied({
    code: "INSUFFICIENT_ROLE",
    message: `必要なロール: ${requiredRole}`,
    requiredRole,
  });
}

/**
 * テナント不一致エラーを作成
 */
export function tenantMismatch(resourceTenantId: string): AuthorizationResult {
  return denied({
    code: "TENANT_MISMATCH",
    message: "このリソースにアクセスする権限がありません",
    resourceId: resourceTenantId,
  });
}
