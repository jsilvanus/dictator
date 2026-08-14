/**
 * MCP (Model Context Protocol) types and interfaces
 */
package com.dictator.core.data.mcp

import kotlinx.serialization.Serializable

/**
 * MCP server transport type
 */
enum class McpTransportType {
    STDIO,
    SSE,
    HTTP
}

/**
 * MCP server configuration
 */
@Serializable
data class McpServerConfig(
    val id: String,
    val userId: String,
    val name: String,
    val enabled: Boolean = true,
    val transportType: String = "stdio", // 'stdio' | 'sse' | 'http'
    
    // For stdio transport
    val serverCommand: String? = null,
    val serverArgs: List<String>? = null,
    
    // For HTTP/SSE transport
    val serverUrl: String? = null,
    
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

/**
 * MCP tool definition (converted from MCP protocol)
 */
@Serializable
data class McpToolDefinition(
    val name: String,
    val description: String = "",
    val inputSchema: McpInputSchema = McpInputSchema()
)

/**
 * MCP input schema for tool parameters
 */
@Serializable
data class McpInputSchema(
    val type: String = "object",
    val properties: Map<String, Map<String, String>> = emptyMap(),
    val required: List<String>? = null
)

/**
 * MCP server state
 */
data class McpServerState(
    val config: McpServerConfig,
    val connected: Boolean = false,
    val lastError: String? = null,
    val lastConnectAttempt: Long? = null,
    val tools: Map<String, McpToolDefinition> = emptyMap()
)

/**
 * MCP tool call request (internal format)
 */
data class McpToolCall(
    val serverId: String,
    val toolName: String,
    val arguments: Map<String, Any?>
)

/**
 * MCP tool call result
 */
data class McpToolResult(
    val success: Boolean,
    val result: Any? = null,
    val error: String? = null
)

/**
 * MCP server registry entry
 */
data class McpServerRegistry(
    val servers: Map<String, McpServerState> = emptyMap(),
    val initialized: Boolean = false
)
