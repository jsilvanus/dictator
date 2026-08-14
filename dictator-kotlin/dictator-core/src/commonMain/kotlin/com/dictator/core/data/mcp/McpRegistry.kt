/**
 * MCP Server Registry and Manager
 * Manages multiple MCP server connections and tool registration
 */
package com.dictator.core.data.mcp

import io.ktor.client.HttpClient
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * MCP Server Manager - manages connections to multiple MCP servers
 */
class McpServerManager(
    private val httpClient: HttpClient
) {
    private val servers = mutableMapOf<String, McpServerState>()
    private val clients = mutableMapOf<String, McpClient>()
    private val mutex = Mutex()

    /**
     * Register and connect to an MCP server
     */
    suspend fun registerServer(config: McpServerConfig): Result<Unit> = mutex.withLock {
        return try {
            // Check if already registered
            if (servers.containsKey(config.id)) {
                return Result.failure(Exception("MCP server with ID '${config.id}' already registered"))
            }

            // Create and connect client
            val client = McpClient(config, httpClient)
            val connectResult = client.connect()

            if (connectResult.isFailure) {
                // Store failed state
                val serverState = McpServerState(
                    config = config,
                    connected = false,
                    lastError = connectResult.exceptionOrNull()?.message,
                    lastConnectAttempt = System.currentTimeMillis(),
                    tools = emptyMap()
                )
                servers[config.id] = serverState
                return Result.failure(connectResult.exceptionOrNull() ?: Exception("Connection failed"))
            }

            // Discover tools
            val toolsResult = client.listTools()
            val toolsMap = if (toolsResult.isSuccess) {
                toolsResult.getOrNull()?.associateBy { it.name } ?: emptyMap()
            } else {
                emptyMap()
            }

            // Store server state
            val serverState = McpServerState(
                config = config,
                connected = true,
                tools = toolsMap,
                lastConnectAttempt = System.currentTimeMillis()
            )

            servers[config.id] = serverState
            clients[config.id] = client
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Unregister and disconnect from an MCP server
     */
    suspend fun unregisterServer(serverId: String): Result<Unit> = mutex.withLock {
        return try {
            val client = clients.remove(serverId)
            client?.disconnect()
            servers.remove(serverId)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get a registered server's state
     */
    suspend fun getServer(serverId: String): McpServerState? = mutex.withLock {
        return servers[serverId]
    }

    /**
     * Get all registered servers
     */
    suspend fun getAllServers(): List<McpServerState> = mutex.withLock {
        return servers.values.toList()
    }

    /**
     * Get a specific tool definition from a server
     */
    suspend fun getTool(serverId: String, toolName: String): McpToolDefinition? = mutex.withLock {
        return servers[serverId]?.tools?.get(toolName)
    }

    /**
     * Get all tools from all servers, prefixed with server ID
     */
    suspend fun getAllTools(): Map<String, Pair<String, McpToolDefinition>> = mutex.withLock {
        val result = mutableMapOf<String, Pair<String, McpToolDefinition>>()
        servers.forEach { (serverId, server) ->
            server.tools.forEach { (toolName, toolDef) ->
                val prefixedName = "mcp_${serverId}_$toolName"
                result[prefixedName] = serverId to toolDef
            }
        }
        return result
    }

    /**
     * Call a tool on a server
     */
    suspend fun callTool(serverId: String, toolName: String, arguments: Map<String, Any?>): Result<McpToolResult> = mutex.withLock {
        return try {
            val client = clients[serverId]
                ?: return Result.failure(Exception("Server not found or not connected: $serverId"))
            
            client.callTool(toolName, arguments)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get all connected servers count
     */
    suspend fun getConnectedServersCount(): Int = mutex.withLock {
        return servers.values.count { it.connected }
    }

    /**
     * Check if server is connected
     */
    suspend fun isServerConnected(serverId: String): Boolean = mutex.withLock {
        return servers[serverId]?.connected ?: false
    }

    /**
     * Reconnect to a server
     */
    suspend fun reconnectServer(serverId: String): Result<Unit> = mutex.withLock {
        return try {
            val serverState = servers[serverId]
                ?: return Result.failure(Exception("Server not found: $serverId"))
            
            // Disconnect current client
            clients[serverId]?.disconnect()
            
            // Create new client and connect
            val client = McpClient(serverState.config, httpClient)
            val connectResult = client.connect()
            
            if (connectResult.isFailure) {
                val failedState = serverState.copy(
                    connected = false,
                    lastError = connectResult.exceptionOrNull()?.message,
                    lastConnectAttempt = System.currentTimeMillis()
                )
                servers[serverId] = failedState
                return Result.failure(connectResult.exceptionOrNull() ?: Exception("Reconnection failed"))
            }
            
            // Rediscover tools
            val toolsResult = client.listTools()
            val toolsMap = if (toolsResult.isSuccess) {
                toolsResult.getOrNull()?.associateBy { it.name } ?: emptyMap()
            } else {
                emptyMap()
            }
            
            val connectedState = serverState.copy(
                connected = true,
                tools = toolsMap,
                lastConnectAttempt = System.currentTimeMillis(),
                lastError = null
            )
            
            servers[serverId] = connectedState
            clients[serverId] = client
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

/**
 * Singleton instance of MCP Server Manager
 */
object McpServerManagerHolder {
    private var _instance: McpServerManager? = null
    
    fun getInstance(httpClient: HttpClient): McpServerManager {
        if (_instance == null) {
            _instance = McpServerManager(httpClient)
        }
        return _instance!!
    }
    
    fun setInstance(manager: McpServerManager) {
        _instance = manager
    }
}
