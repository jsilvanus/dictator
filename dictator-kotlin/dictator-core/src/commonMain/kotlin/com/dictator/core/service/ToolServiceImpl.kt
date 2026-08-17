/**
 * Tool Service Interface and Implementation
 * Orchestrates tool execution and management
 */
package com.dictator.core.service

import com.dictator.core.data.tools.*

/**
 * Tool Service Implementation
 */
class ToolServiceImpl(
    private val toolRegistry: ToolRegistry,
    private val permissionsManager: ToolPermissionsManager,
    private val toolExecutor: ToolExecutor,
    private val remoteApiService: com.dictator.core.data.remote.RemoteApiService? = null
) : ToolService {

    /**
     * Register a tool
     */
    override suspend fun registerTool(tool: RegisteredTool): Result<Unit> {
        return toolRegistry.registerTool(tool)
    }

    /**
     * Get a tool by name
     */
    override suspend fun getTool(name: String): RegisteredTool? {
        return toolRegistry.getTool(name)
    }

    /**
     * Get all tools
     */
    override suspend fun getAllTools(): List<RegisteredTool> {
        return toolRegistry.getAllTools()
    }

    /**
     * Search tools
     */
    override suspend fun searchTools(query: String): List<RegisteredTool> {
        return toolRegistry.searchTools(query)
    }

    /**
     * Execute a tool
     */
    override suspend fun executeTool(
        toolName: String,
        arguments: Map<String, Any?>,
        context: ToolExecutionContext
    ): Result<ToolResult> {
        return toolExecutor.executeTool(toolName, arguments, context)
    }

    /**
     * Check if user has permission for tool
     */
    override suspend fun hasPermission(
        userId: String,
        target: String,
        toolType: String,
        documentId: String?
    ): Boolean {
        return permissionsManager.hasPermission(userId, target, toolType, documentId)
    }

    /**
     * Grant a permission
     */
    override suspend fun grantPermission(permission: ToolPermission): Result<ToolPermission> {
        // Save to remote if available
        remoteApiService?.saveToolPermission(permission)?.onFailure {
            println("Warning: Failed to save tool permission to remote: ${it.message}")
        }
        
        return permissionsManager.grantPermission(permission)
    }

    /**
     * Revoke a permission
     */
    override suspend fun revokePermission(permissionId: String): Result<Unit> {
        // Notify remote if available
        remoteApiService?.deleteToolPermission(permissionId)?.onFailure {
            println("Warning: Failed to delete tool permission from remote: ${it.message}")
        }
        
        return permissionsManager.revokePermission(permissionId)
    }

    /**
     * Get permissions for user
     */
    override suspend fun getPermissionsForUser(userId: String): List<ToolPermission> {
        return permissionsManager.getPermissionsForUser(userId)
    }

    /**
     * Request a permission
     */
    override suspend fun requestPermission(request: PermissionRequest): Result<PermissionRequest> {
        return permissionsManager.createPermissionRequest(request)
    }

    /**
     * Approve a permission request
     */
    override suspend fun approvePermissionRequest(
        requestId: String,
        mode: ToolPermissionMode
    ): Result<ToolPermission> {
        return permissionsManager.approveRequest(requestId, mode)
    }

    /**
     * Reject a permission request
     */
    override suspend fun rejectPermissionRequest(requestId: String): Result<Unit> {
        return permissionsManager.rejectRequest(requestId)
    }

    /**
     * Get pending requests for user
     */
    override suspend fun getPendingRequests(userId: String): List<PermissionRequest> {
        return permissionsManager.getPendingRequests(userId)
    }

    /**
     * Get tool logs
     */
    override suspend fun getToolLogs(toolName: String): List<ToolExecutionLog> {
        return toolExecutor.getToolLogs(toolName)
    }

    /**
     * Get user logs
     */
    override suspend fun getUserLogs(userId: String): List<ToolExecutionLog> {
        return toolExecutor.getUserLogs(userId)
    }

    /**
     * Get execution statistics
     */
    suspend fun getExecutionStatistics(): ToolExecutionStatistics {
        return toolExecutor.getStatistics()
    }

    /**
     * Get permission statistics
     */
    suspend fun getPermissionStatistics(): PermissionStatistics {
        return permissionsManager.getStatistics()
    }
}
