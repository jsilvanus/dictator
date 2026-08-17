/**
 * MCP Service Interface and Implementation
 * Manages MCP server connections and tool execution
 */
package com.dictator.core.service

import com.dictator.core.data.mcp.*
import io.ktor.client.HttpClient

/**
 * MCP Service Implementation
 */
class McpServiceImpl(
    private val httpClient: HttpClient,
    private val remoteApiService: com.dictator.core.data.remote.RemoteApiService? = null
) : McpService {
    
    private val mcpManager = McpServerManager(httpClient)
    private val toolAdapter = McpToolAdapter(mcpManager)

    /**
     * Register a new MCP server
     */
    override suspend fun registerServer(config: McpServerConfig): Result<Unit> {
        // First, save to remote if API service is available
        remoteApiService?.registerMcpServer(config)?.onFailure {
            // Log error but don't fail - allow local-only operation
            println("Warning: Failed to save MCP server to remote: ${it.message}")
        }
        
        // Then register locally
        return mcpManager.registerServer(config)
    }

    /**
     * Unregister an MCP server
     */
    override suspend fun unregisterServer(serverId: String): Result<Unit> {
        // First, notify remote if API service is available
        remoteApiService?.unregisterMcpServer(serverId)?.onFailure {
            println("Warning: Failed to remove MCP server from remote: ${it.message}")
        }
        
        // Then unregister locally
        return mcpManager.unregisterServer(serverId)
    }

    /**
     * Get a specific MCP server
     */
    override suspend fun getServer(serverId: String): McpServerState? {
        return mcpManager.getServer(serverId)
    }

    /**
     * Get all registered MCP servers
     */
    override suspend fun getAllServers(): List<McpServerState> {
        return mcpManager.getAllServers()
    }

    /**
     * Get a specific tool from a server
     */
    override suspend fun getTool(serverId: String, toolName: String): McpToolDefinition? {
        return mcpManager.getTool(serverId, toolName)
    }

    /**
     * Get all tools from all servers
     */
    override suspend fun getAllTools(): Map<String, Pair<String, McpToolDefinition>> {
        return mcpManager.getAllTools()
    }

    /**
     * Call a tool on a specific MCP server
     */
    override suspend fun callTool(serverId: String, toolName: String, arguments: Map<String, Any?>): Result<McpToolResult> {
        return mcpManager.callTool(serverId, toolName, arguments)
    }

    /**
     * Reconnect to an MCP server
     */
    override suspend fun reconnectServer(serverId: String): Result<Unit> {
        return mcpManager.reconnectServer(serverId)
    }

    /**
     * Get count of connected servers
     */
    override suspend fun getConnectedServersCount(): Int {
        return mcpManager.getConnectedServersCount()
    }

    /**
     * Get tools for a specific server
     */
    override suspend fun getServerTools(serverId: String): Map<String, McpToolDefinition> {
        return toolAdapter.getServerTools(serverId)
    }

    /**
     * Get the tool adapter for direct access
     */
    fun getToolAdapter(): McpToolAdapter = toolAdapter

    /**
     * Get all MCP tool names (prefixed)
     */
    suspend fun getAllMcpToolNames(): List<String> {
        return toolAdapter.getAllMcpToolNames()
    }

    /**
     * Check if a tool name is an MCP tool
     */
    fun isMcpTool(toolName: String): Boolean {
        return toolAdapter.isMcpTool(toolName)
    }
}
