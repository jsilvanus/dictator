/**
 * MCP Tool Adapter
 * Integrates MCP tools into the Dictator tool system
 */
package com.dictator.core.data.mcp

/**
 * Adapter for MCP tools to work with the tool registry
 */
class McpToolAdapter(
    private val mcpManager: McpServerManager
) {
    
    /**
     * Register all MCP tools into the tool system
     * Tools will be named as: mcp_<serverId>_<toolName>
     */
    suspend fun registerAllMcpTools(): Result<Map<String, McpToolDefinition>> = try {
        val allTools = mcpManager.getAllTools()
        val registeredTools = mutableMapOf<String, McpToolDefinition>()
        
        allTools.forEach { (prefixedName, pair) ->
            val (_, toolDef) = pair
            registeredTools[prefixedName] = toolDef
        }
        
        Result.success(registeredTools)
    } catch (e: Exception) {
        Result.failure(e)
    }

    /**
     * Parse MCP tool name to extract server ID and tool name
     * Format: mcp_<serverId>_<toolName>
     */
    fun parseMcpToolName(toolName: String): Pair<String, String>? {
        if (!toolName.startsWith("mcp_")) {
            return null
        }
        
        val parts = toolName.removePrefix("mcp_").split("_", limit = 2)
        if (parts.size < 2) {
            return null
        }
        
        return parts[0] to parts[1]
    }

    /**
     * Check if a tool name is an MCP tool
     */
    fun isMcpTool(toolName: String): Boolean {
        return toolName.startsWith("mcp_") && parseMcpToolName(toolName) != null
    }

    /**
     * Get MCP tool definition by prefixed name
     */
    suspend fun getMcpToolDefinition(prefixedName: String): McpToolDefinition? = try {
        val parsed = parseMcpToolName(prefixedName)
            ?: return null
        
        mcpManager.getTool(parsed.first, parsed.second)
    } catch (e: Exception) {
        null
    }

    /**
     * Get all registered MCP tool names
     */
    suspend fun getAllMcpToolNames(): List<String> = try {
        mcpManager.getAllTools().keys.toList()
    } catch (e: Exception) {
        emptyList()
    }

    /**
     * Get MCP tools for a specific server
     */
    suspend fun getServerTools(serverId: String): Map<String, McpToolDefinition> = try {
        val server = mcpManager.getServer(serverId)
        server?.tools ?: emptyMap()
    } catch (e: Exception) {
        emptyMap()
    }

    /**
     * Create a prefixed tool name from server and tool names
     */
    fun createPrefixedName(serverId: String, toolName: String): String {
        return "mcp_${serverId}_$toolName"
    }
}
