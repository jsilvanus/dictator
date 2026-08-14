/**
 * Tool execution types and interfaces
 */
package com.dictator.core.data.tools

import kotlinx.serialization.Serializable

/**
 * Context available during tool execution
 */
@Serializable
data class ToolExecutionContext(
    val userId: String,
    val documentId: String? = null,
    val sessionId: String? = null,
    val requestId: String
)

/**
 * Tool input schema definition
 */
@Serializable
data class ToolInputSchema(
    val type: String = "object",
    val properties: Map<String, Map<String, String>> = emptyMap(),
    val required: List<String>? = null
)

/**
 * Registered tool definition
 */
@Serializable
data class RegisteredTool(
    val name: String,
    val description: String,
    val inputSchema: ToolInputSchema = ToolInputSchema(),
    val toolType: String = "built-in", // 'built-in', 'http', 'mcp'
    val requiresPermission: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

/**
 * Tool execution result
 */
@Serializable
data class ToolResult(
    val success: Boolean,
    val result: String? = null,
    val error: String? = null,
    val executedAt: Long = System.currentTimeMillis()
)

/**
 * Tool permission modes
 */
enum class ToolPermissionMode {
    ONCE,
    PER_DOCUMENT,
    ALWAYS
}

/**
 * Tool permission record
 */
@Serializable
data class ToolPermission(
    val id: String,
    val userId: String,
    val target: String, // URL for HTTP tools, MCP name for MCP tools
    val toolType: String, // 'http', 'mcp', 'built-in'
    val mode: String, // 'once', 'per-document', 'always'
    val documentId: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val expiresAt: Long? = null
)

/**
 * Permission request from AI tool execution
 */
@Serializable
data class PermissionRequest(
    val id: String,
    val userId: String,
    val target: String,
    val toolType: String, // 'http', 'mcp'
    val reason: String,
    val documentId: String? = null,
    val requestedAt: Long = System.currentTimeMillis()
)

/**
 * HTTP tool configuration
 */
@Serializable
data class HttpToolConfig(
    val url: String,
    val method: String = "GET", // GET, POST, PUT, DELETE, PATCH
    val headers: Map<String, String> = emptyMap(),
    val requiresPermission: Boolean = true,
    val timeout: Long = 30000 // ms
)

/**
 * Built-in tool types
 */
enum class BuiltInToolType {
    TEXT_EDIT,
    TEXT_INSERT,
    TEXT_DELETE,
    SEARCH_DOCUMENT,
    GET_DOCUMENT_SECTION,
    GET_PARAGRAPH,
    HTTP_GET,
    HTTP_POST
}

/**
 * Tool execution log entry
 */
@Serializable
data class ToolExecutionLog(
    val id: String,
    val userId: String,
    val toolName: String,
    val arguments: Map<String, String> = emptyMap(),
    val success: Boolean,
    val result: String? = null,
    val error: String? = null,
    val permissionRequired: Boolean = false,
    val permissionGranted: Boolean = false,
    val executedAt: Long = System.currentTimeMillis(),
    val duration: Long = 0 // ms
)
