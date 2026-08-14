package com.dictator.core.service

/**
 * Service layer interfaces for business logic.
 * These services orchestrate operations across repositories and utilities.
 */

/**
 * Authentication service for user login, signup, and session management.
 */
interface AuthService {
    suspend fun login(email: String, password: String): String  // Returns JWT token
    suspend fun signup(email: String, name: String, password: String): String
    suspend fun logout()
    suspend fun validateToken(token: String): Boolean
    suspend fun refreshToken(token: String): String
    fun getCurrentUserId(): String?
}

/**
 * Document service for CRUD operations and management.
 */
interface DocumentService {
    suspend fun getDocuments(userId: String): List<com.dictator.core.domain.entity.Document>
    suspend fun createDocument(title: String, folderId: String, userId: String?): com.dictator.core.domain.entity.Document
    suspend fun updateDocument(id: String, title: String, userId: String?): com.dictator.core.domain.entity.Document
    suspend fun deleteDocument(id: String)
    suspend fun getDocumentById(id: String): com.dictator.core.domain.entity.Document?
}

/**
 * Voice processing service for voice input and command parsing.
 */
interface VoiceService {
    suspend fun processVoiceInput(audio: ByteArray): String  // Returns transcribed text
    suspend fun parseCommand(text: String): com.dictator.core.util.voice.ParsedCommand?
    suspend fun normalizePunctuation(text: String): String
}

/**
 * AI service for Claude API interaction.
 */
interface AiService {
    suspend fun askInline(prompt: String, context: String): String
    suspend fun startSession(mode: String, userId: String?): com.dictator.core.domain.entity.AiSession
    suspend fun addTurn(sessionId: String, role: String, content: String): com.dictator.core.domain.entity.AiSession
}

/**
 * Sync service for device-aware synchronization.
 */
interface SyncService {
    suspend fun syncDocument(documentId: String, deviceId: String): com.dictator.core.domain.entity.Document
    suspend fun pushChanges(documentId: String, changes: Map<String, String>, deviceId: String)
    suspend fun pullChanges(documentId: String, since: Long = 0): List<com.dictator.core.domain.entity.DocumentVersion>
    suspend fun getSyncStatus(documentId: String): com.dictator.core.domain.entity.SyncMetadata?
    suspend fun resolveSyncConflict(conflictId: String, resolution: com.dictator.core.domain.entity.DocumentVersion)
}

/**
 * Folder service for folder management and hierarchy.
 */
interface FolderService {
    suspend fun getFolders(userId: String): List<com.dictator.core.domain.entity.Folder>
    suspend fun createFolder(name: String, userId: String, parentId: String?): com.dictator.core.domain.entity.Folder
    suspend fun updateFolder(id: String, name: String): com.dictator.core.domain.entity.Folder
    suspend fun deleteFolder(id: String)
    suspend fun getFolderHierarchy(userId: String): List<com.dictator.core.domain.entity.Folder>
}

/**
 * Share service for document sharing and collaboration.
 */
interface ShareService {
    suspend fun shareDocument(documentId: String, withUserId: String, permission: String): com.dictator.core.domain.entity.Share
    suspend fun updateShare(shareId: String, permission: String): com.dictator.core.domain.entity.Share
    suspend fun revokeShare(shareId: String)
    suspend fun getSharedDocuments(userId: String): List<com.dictator.core.domain.entity.Document>
}

/**
 * MCP (Model Context Protocol) service for managing MCP servers and tools.
 */
interface McpService {
    suspend fun registerServer(config: com.dictator.core.data.mcp.McpServerConfig): Result<Unit>
    suspend fun unregisterServer(serverId: String): Result<Unit>
    suspend fun getServer(serverId: String): com.dictator.core.data.mcp.McpServerState?
    suspend fun getAllServers(): List<com.dictator.core.data.mcp.McpServerState>
    suspend fun getTool(serverId: String, toolName: String): com.dictator.core.data.mcp.McpToolDefinition?
    suspend fun getAllTools(): Map<String, Pair<String, com.dictator.core.data.mcp.McpToolDefinition>>
    suspend fun callTool(serverId: String, toolName: String, arguments: Map<String, Any?>): Result<com.dictator.core.data.mcp.McpToolResult>
    suspend fun reconnectServer(serverId: String): Result<Unit>
    suspend fun getConnectedServersCount(): Int
    suspend fun getServerTools(serverId: String): Map<String, com.dictator.core.data.mcp.McpToolDefinition>
}

/**
 * Privacy service for sensitive data detection, telemetry, and privacy policies.
 */
interface PrivacyService {
    suspend fun detectSensitiveData(text: String): List<com.dictator.core.data.privacy.DetectedSensitiveData>
    suspend fun containsSensitiveData(text: String): Boolean
    suspend fun calculatePrivacyRisk(text: String): Float
    suspend fun isSafeForAiProcessing(text: String): Boolean
    suspend fun recordEvent(userId: String, eventType: String, metadata: Map<String, String> = emptyMap())
    suspend fun recordAiQueryEvent(userId: String, provider: String, model: String, hasSensitiveData: Boolean)
    suspend fun getProviderPolicy(provider: String): com.dictator.core.data.privacy.AiProviderPolicy?
    suspend fun getAllProviderPolicies(): List<com.dictator.core.data.privacy.AiProviderPolicy>
    suspend fun getPrivacyScore(provider: String): Float
    suspend fun isGdprCompliant(provider: String): Boolean
    suspend fun getUserPrivacySettings(userId: String): com.dictator.core.data.privacy.UserPrivacySettings
    suspend fun updatePrivacySettings(userId: String, settings: com.dictator.core.data.privacy.UserPrivacySettings)
    suspend fun logPrivacyEvent(userId: String, eventType: String, details: String)
}

/**
 * Tool service for tool execution and permissions management.
 */
interface ToolService {
    suspend fun registerTool(tool: com.dictator.core.data.tools.RegisteredTool): Result<Unit>
    suspend fun getTool(name: String): com.dictator.core.data.tools.RegisteredTool?
    suspend fun getAllTools(): List<com.dictator.core.data.tools.RegisteredTool>
    suspend fun searchTools(query: String): List<com.dictator.core.data.tools.RegisteredTool>
    suspend fun executeTool(toolName: String, arguments: Map<String, Any?>, context: com.dictator.core.data.tools.ToolExecutionContext): Result<com.dictator.core.data.tools.ToolResult>
    suspend fun hasPermission(userId: String, target: String, toolType: String, documentId: String? = null): Boolean
    suspend fun grantPermission(permission: com.dictator.core.data.tools.ToolPermission): Result<com.dictator.core.data.tools.ToolPermission>
    suspend fun revokePermission(permissionId: String): Result<Unit>
    suspend fun getPermissionsForUser(userId: String): List<com.dictator.core.data.tools.ToolPermission>
    suspend fun requestPermission(request: com.dictator.core.data.tools.PermissionRequest): Result<com.dictator.core.data.tools.PermissionRequest>
    suspend fun approvePermissionRequest(requestId: String, mode: com.dictator.core.data.tools.ToolPermissionMode): Result<com.dictator.core.data.tools.ToolPermission>
    suspend fun rejectPermissionRequest(requestId: String): Result<Unit>
    suspend fun getPendingRequests(userId: String): List<com.dictator.core.data.tools.PermissionRequest>
    suspend fun getToolLogs(toolName: String): List<com.dictator.core.data.tools.ToolExecutionLog>
    suspend fun getUserLogs(userId: String): List<com.dictator.core.data.tools.ToolExecutionLog>
}
