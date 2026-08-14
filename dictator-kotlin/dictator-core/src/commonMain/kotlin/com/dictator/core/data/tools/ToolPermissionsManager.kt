/**
 * Tool Permissions Manager
 * Manages permissions for tool execution
 */
package com.dictator.core.data.tools

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.uuid.Uuid

/**
 * Tool permissions manager
 */
class ToolPermissionsManager {
    
    private val permissions = mutableListOf<ToolPermission>()
    private val permissionRequests = mutableListOf<PermissionRequest>()
    private val mutex = Mutex()

    /**
     * Grant a permission
     */
    suspend fun grantPermission(permission: ToolPermission): Result<ToolPermission> = mutex.withLock {
        return try {
            val fullPermission = permission.copy(
                id = permission.id.ifEmpty { Uuid.random().toString() }
            )
            permissions.add(fullPermission)
            Result.success(fullPermission)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Revoke a permission
     */
    suspend fun revokePermission(permissionId: String): Result<Unit> = mutex.withLock {
        return try {
            permissions.removeAll { it.id == permissionId }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Revoke all permissions for a user-target combination
     */
    suspend fun revokeAllPermissionsForTarget(userId: String, target: String): Result<Unit> = mutex.withLock {
        return try {
            permissions.removeAll { it.userId == userId && it.target == target }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Check if permission is granted
     */
    suspend fun hasPermission(userId: String, target: String, toolType: String, documentId: String? = null): Boolean = mutex.withLock {
        val now = System.currentTimeMillis()
        
        // Check for matching permission
        return permissions.any { perm ->
            perm.userId == userId &&
            perm.target == target &&
            perm.toolType == toolType &&
            (perm.expiresAt == null || perm.expiresAt > now) && // Not expired
            when (perm.mode) {
                "always" -> true
                "per-document" -> perm.documentId == documentId
                "once" -> {
                    // "once" permissions should be checked and removed after use
                    // For now, treat as valid
                    true
                }
                else -> false
            }
        }
    }

    /**
     * Check if permission is granted for "once" mode and remove it
     */
    suspend fun checkAndRemoveOncePermission(userId: String, target: String, toolType: String): Boolean = mutex.withLock {
        val permission = permissions.firstOrNull { perm ->
            perm.userId == userId &&
            perm.target == target &&
            perm.toolType == toolType &&
            perm.mode == "once"
        }
        
        if (permission != null) {
            permissions.remove(permission)
            return true
        }
        return false
    }

    /**
     * Get permission for a user-target-document
     */
    suspend fun getPermission(userId: String, target: String, toolType: String): ToolPermission? = mutex.withLock {
        return permissions.firstOrNull { 
            it.userId == userId &&
            it.target == target &&
            it.toolType == toolType
        }
    }

    /**
     * Get all permissions for a user
     */
    suspend fun getPermissionsForUser(userId: String): List<ToolPermission> = mutex.withLock {
        return permissions.filter { it.userId == userId }.toList()
    }

    /**
     * Get all permissions for a target
     */
    suspend fun getPermissionsForTarget(target: String): List<ToolPermission> = mutex.withLock {
        return permissions.filter { it.target == target }.toList()
    }

    /**
     * Create a permission request
     */
    suspend fun createPermissionRequest(request: PermissionRequest): Result<PermissionRequest> = mutex.withLock {
        return try {
            val fullRequest = request.copy(
                id = request.id.ifEmpty { Uuid.random().toString() }
            )
            permissionRequests.add(fullRequest)
            Result.success(fullRequest)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get pending permission requests for a user
     */
    suspend fun getPendingRequests(userId: String): List<PermissionRequest> = mutex.withLock {
        return permissionRequests.filter { it.userId == userId }.toList()
    }

    /**
     * Approve a permission request
     */
    suspend fun approveRequest(requestId: String, mode: ToolPermissionMode = ToolPermissionMode.ONCE): Result<ToolPermission> = mutex.withLock {
        return try {
            val request = permissionRequests.firstOrNull { it.id == requestId }
                ?: return Result.failure(Exception("Request not found: $requestId"))
            
            val permission = ToolPermission(
                id = Uuid.random().toString(),
                userId = request.userId,
                target = request.target,
                toolType = request.toolType,
                mode = mode.name.lowercase(),
                documentId = request.documentId
            )
            
            permissions.add(permission)
            permissionRequests.remove(request)
            Result.success(permission)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Reject a permission request
     */
    suspend fun rejectRequest(requestId: String): Result<Unit> = mutex.withLock {
        return try {
            permissionRequests.removeAll { it.id == requestId }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Clear all permissions
     */
    suspend fun clearAllPermissions() = mutex.withLock {
        permissions.clear()
    }

    /**
     * Clear all expired permissions
     */
    suspend fun clearExpiredPermissions() = mutex.withLock {
        val now = System.currentTimeMillis()
        permissions.removeAll { perm -> perm.expiresAt != null && perm.expiresAt <= now }
    }

    /**
     * Get permission statistics
     */
    suspend fun getStatistics(): PermissionStatistics = mutex.withLock {
        val byMode = permissions.groupingBy { it.mode }.eachCount()
        val byToolType = permissions.groupingBy { it.toolType }.eachCount()
        val byTarget = permissions.groupingBy { it.target }.eachCount()
        
        return PermissionStatistics(
            totalPermissions = permissions.size,
            pendingRequests = permissionRequests.size,
            permissionsByMode = byMode,
            permissionsByToolType = byToolType,
            permissionsByTarget = byTarget
        )
    }
}

/**
 * Permission statistics
 */
data class PermissionStatistics(
    val totalPermissions: Int,
    val pendingRequests: Int,
    val permissionsByMode: Map<String, Int>,
    val permissionsByToolType: Map<String, Int>,
    val permissionsByTarget: Map<String, Int>
)
