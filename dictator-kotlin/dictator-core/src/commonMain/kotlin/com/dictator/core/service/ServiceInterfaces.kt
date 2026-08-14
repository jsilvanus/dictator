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
