/**
 * Selection Permission Manager
 * Handles PII detection and permission management for text selections
 * Supports voice and UI-based permission granting
 */

import type { PermissionScope, PiiDetectionResult, SelectionPermission, SensitiveDataType } from './types';

interface PermissionCheckOptions {
  userId: string;
  documentId?: string;
  modelId?: string;
  piiDetectionResult: PiiDetectionResult;
}

/**
 * In-memory permission cache during a session
 * Keys are "{userId}:{piiType}:{scope}" or "{userId}:{documentId}:{piiType}"
 */
const permissionCache = new Map<string, SelectionPermission>();

/**
 * Generate cache key for permission lookup
 */
function getPermissionCacheKey(
  userId: string,
  piiType: SensitiveDataType,
  scope: PermissionScope,
  documentId?: string,
): string {
  if (scope === 'document' && documentId) {
    return `${userId}:${documentId}:${piiType}`;
  }
  if (scope === 'user') {
    return `${userId}:user:${piiType}`;
  }
  // model scope (session-only)
  return `${userId}:model:${piiType}`;
}

/**
 * Check if user has permission to send content with detected PII
 * Checks in order: model-scoped (current session), document-scoped, user-scoped
 */
export function checkPermissionForPii(
  options: PermissionCheckOptions,
): {
  allowed: boolean;
  requiresPermission: SensitiveDataType[];
  permissions: SelectionPermission[];
} {
  const { userId, documentId, piiDetectionResult } = options;

  const allowedPiiTypes: Set<SensitiveDataType> = new Set();
  const foundPermissions: SelectionPermission[] = [];

  for (const piiType of piiDetectionResult.types) {
    // Check model-scoped permission first (session memory)
    const modelKey = getPermissionCacheKey(userId, piiType, 'model');
    if (permissionCache.has(modelKey)) {
      const permission = permissionCache.get(modelKey)!;
      if (!permission.expiresAt || permission.expiresAt > Date.now()) {
        allowedPiiTypes.add(piiType);
        foundPermissions.push(permission);
        continue;
      } else {
        permissionCache.delete(modelKey);
      }
    }

    // Check document-scoped permission
    if (documentId) {
      const docKey = getPermissionCacheKey(userId, piiType, 'document', documentId);
      if (permissionCache.has(docKey)) {
        const permission = permissionCache.get(docKey)!;
        if (!permission.expiresAt || permission.expiresAt > Date.now()) {
          allowedPiiTypes.add(piiType);
          foundPermissions.push(permission);
          continue;
        } else {
          permissionCache.delete(docKey);
        }
      }
    }

    // Check user-scoped permission
    const userKey = getPermissionCacheKey(userId, piiType, 'user');
    if (permissionCache.has(userKey)) {
      const permission = permissionCache.get(userKey)!;
      if (!permission.expiresAt || permission.expiresAt > Date.now()) {
        allowedPiiTypes.add(piiType);
        foundPermissions.push(permission);
      } else {
        permissionCache.delete(userKey);
      }
    }
  }

  const requiresPermission = piiDetectionResult.types.filter(
    (type) => !allowedPiiTypes.has(type),
  );

  return {
    allowed: requiresPermission.length === 0,
    requiresPermission,
    permissions: foundPermissions,
  };
}

/**
 * Grant a permission to the user
 * For model-scoped permissions, they only persist in memory during the session
 * For user/document-scoped permissions, these should be persisted to the database
 */
export function grantPermission(
  userId: string,
  piiType: SensitiveDataType,
  scope: PermissionScope,
  grantedBy: 'voice' | 'ui' = 'ui',
  documentId?: string,
): SelectionPermission {
  const permission: SelectionPermission = {
    id: `perm_${userId}_${piiType}_${scope}_${Date.now()}`,
    userId,
    piiType,
    scope,
    grantedBy,
    grantedAt: Date.now(),
    documentId: scope === 'document' ? documentId : undefined,
  };

  const key = getPermissionCacheKey(userId, piiType, scope, documentId);
  permissionCache.set(key, permission);

  return permission;
}

/**
 * Revoke a permission
 */
export function revokePermission(
  userId: string,
  piiType: SensitiveDataType,
  scope: PermissionScope,
  documentId?: string,
): boolean {
  const key = getPermissionCacheKey(userId, piiType, scope, documentId);
  return permissionCache.delete(key);
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(userId: string): SelectionPermission[] {
  const permissions: SelectionPermission[] = [];

  for (const permission of permissionCache.values()) {
    if (permission.userId === userId) {
      // Filter out expired permissions
      if (!permission.expiresAt || permission.expiresAt > Date.now()) {
        permissions.push(permission);
      }
    }
  }

  return permissions;
}

/**
 * Clear all session-scoped (model-scoped) permissions
 * Called when user logs out or session ends
 */
export function clearSessionPermissions(userId: string): void {
  const keysToDelete: string[] = [];

  for (const [key, permission] of permissionCache.entries()) {
    if (permission.userId === userId && permission.scope === 'model') {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => permissionCache.delete(key));
}

/**
 * Build permission request for UI/voice display
 */
export function buildPermissionRequest(
  piiTypes: SensitiveDataType[],
  selectedText: string,
  confidence: number,
): {
  piiTypes: SensitiveDataType[];
  selectedTextPreview: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
} {
  // Determine risk level based on confidence and PII types
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  if (piiTypes.includes('credit-card') || piiTypes.includes('ssn')) {
    riskLevel = 'high';
  } else if (
    piiTypes.includes('password') ||
    piiTypes.includes('api-key') ||
    piiTypes.includes('auth-token')
  ) {
    riskLevel = 'high';
  } else if (piiTypes.includes('email') && confidence > 0.8) {
    riskLevel = 'medium';
  } else if (piiTypes.includes('phone') && confidence > 0.8) {
    riskLevel = 'medium';
  }

  // Truncate preview to first 100 chars
  const preview = selectedText.length > 100 ? selectedText.slice(0, 100) + '...' : selectedText;

  return {
    piiTypes,
    selectedTextPreview: preview,
    confidence,
    riskLevel,
  };
}

/**
 * Format PII types for voice feedback
 */
export function formatPiiTypesForVoice(piiTypes: SensitiveDataType[]): string {
  const labels: Record<SensitiveDataType, string> = {
    'credit-card': 'credit card',
    ssn: 'social security number',
    phone: 'phone number',
    email: 'email address',
    'api-key': 'API key',
    'auth-token': 'authentication token',
    password: 'password',
    ip: 'IP address',
    'license-plate': 'license plate',
    'bank-account': 'bank account',
    'routing-number': 'routing number',
    url: 'URL',
  };

  const formatted = piiTypes.map((type) => labels[type] || type).join(', ');
  return formatted;
}

/**
 * Generate voice feedback for permission request
 */
export function generatePermissionVoiceFeedback(
  piiTypes: SensitiveDataType[],
  _scope: PermissionScope = 'model',
): string {
  const formattedPii = formatPiiTypesForVoice(piiTypes);
  return `The selection contains ${formattedPii}. Do you allow sending this to the AI? Say yes or allow to accept, no or cancel to reject.`;
}
