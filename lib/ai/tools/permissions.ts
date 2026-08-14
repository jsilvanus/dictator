/**
 * Permission management system for tool execution
 * Handles approval/denial of tool calls based on user permissions
 */

import { ToolPermission, ToolPermissionMode } from './types';

/**
 * In-memory permission storage (implements PermissionManager interface)
 * In production, this would use a database
 */
class PermissionManager {
  private permissions: Map<string, ToolPermission[]> = new Map();

  /**
   * Check if user has permission to execute a tool against a target
   * @param userId User requesting execution
   * @param target URL or MCP name being targeted
   * @param documentId Optional document scope
   * @returns true if permission granted, false otherwise
   */
  checkPermission(userId: string, target: string, documentId?: string): boolean {
    const userPermissions = this.permissions.get(userId) ?? [];

    // Check for matching permissions
    for (const perm of userPermissions) {
      // Check if permission matches target
      if (!this.targetMatches(perm.target, target)) {
        continue;
      }

      // Check expiration
      if (perm.expiresAt && new Date() > perm.expiresAt) {
        continue;
      }

      // Check mode applicability
      if (perm.mode === 'always') {
        return true;
      }

      if (perm.mode === 'per-document' && documentId && perm.documentId === documentId) {
        return true;
      }

      if (perm.mode === 'once' && documentId && perm.documentId === documentId) {
        // Expire this permission after one use
        perm.expiresAt = new Date();
        return true;
      }
    }

    return false;
  }

  /**
   * Grant permission for a user to execute against a target
   * @param userId User being granted permission
   * @param target URL or MCP name
   * @param toolType Type of tool ('http' or 'mcp')
   * @param mode Approval mode
   * @param documentId Optional document scope
   * @param expiresAt Optional expiration time
   * @returns Created permission record
   */
  grantPermission(
    userId: string,
    target: string,
    toolType: 'http' | 'mcp',
    mode: ToolPermissionMode,
    documentId?: string,
    expiresAt?: Date
  ): ToolPermission {
    const permission: ToolPermission = {
      id: `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      target,
      toolType,
      mode,
      documentId,
      createdAt: new Date(),
      expiresAt,
    };

    const userPermissions = this.permissions.get(userId) ?? [];
    userPermissions.push(permission);
    this.permissions.set(userId, userPermissions);

    return permission;
  }

  /**
   * Revoke permission for a user against a target
   * @param userId User whose permission to revoke
   * @param target URL or MCP name
   * @param documentId Optional document scope (only revoke document-scoped perms if provided)
   * @returns true if permission was revoked, false if not found
   */
  revokePermission(userId: string, target: string, documentId?: string): boolean {
    const userPermissions = this.permissions.get(userId) ?? [];
    const initialLength = userPermissions.length;

    const filtered = userPermissions.filter((perm) => {
      const targetMatches = this.targetMatches(perm.target, target);
      if (!targetMatches) return true; // Keep non-matching

      if (documentId && perm.documentId !== documentId) {
        return true; // Keep if different document
      }

      return false; // Remove this permission
    });

    if (filtered.length < initialLength) {
      this.permissions.set(userId, filtered);
      return true;
    }

    return false;
  }

  /**
   * List all permissions for a user
   * @param userId User ID
   * @returns Array of permission records
   */
  listPermissions(userId: string): ToolPermission[] {
    return this.permissions.get(userId) ?? [];
  }

  /**
   * List all active (non-expired) permissions for a user
   * @param userId User ID
   * @returns Array of active permission records
   */
  listActivePermissions(userId: string): ToolPermission[] {
    const now = new Date();
    return this.listPermissions(userId).filter((perm) => !perm.expiresAt || perm.expiresAt > now);
  }

  /**
   * Clear all permissions for a user (useful for testing)
   * @param userId User ID
   */
  clearUserPermissions(userId: string): void {
    this.permissions.delete(userId);
  }

  /**
   * Clear all permissions (useful for testing)
   */
  clearAllPermissions(): void {
    this.permissions.clear();
  }

  /**
   * Check if a target matches a permission pattern
   * Supports wildcards for domain-level matching (e.g., *.example.com)
   * @param permissionTarget Pattern from permission record
   * @param requestTarget Actual target being accessed
   * @returns true if targets match
   */
  private targetMatches(permissionTarget: string, requestTarget: string): boolean {
    // Exact match
    if (permissionTarget === requestTarget) {
      return true;
    }

    // Wildcard matching (simple pattern matching)
    if (permissionTarget.includes('*')) {
      const pattern = permissionTarget
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
        .replace(/\*/g, '.*'); // Convert * to .*

      const regex = new RegExp(`^${pattern}$`);
      return regex.test(requestTarget);
    }

    return false;
  }
}

/**
 * Global singleton permission manager instance
 */
let globalPermissionManager: PermissionManager | null = null;

/**
 * Get or create the global permission manager
 */
export function getPermissionManager(): PermissionManager {
  if (!globalPermissionManager) {
    globalPermissionManager = new PermissionManager();
  }
  return globalPermissionManager;
}

/**
 * Create a new permission manager instance (useful for testing)
 */
export function createPermissionManager(): PermissionManager {
  return new PermissionManager();
}

export default getPermissionManager;
