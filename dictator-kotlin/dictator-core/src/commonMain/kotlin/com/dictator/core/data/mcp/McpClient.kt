/**
 * MCP Client for connecting to Model Context Protocol servers
 */
package com.dictator.core.data.mcp

import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * MCP Client wrapper for connecting to MCP servers
 */
class McpClient(
    private val config: McpServerConfig,
    private val httpClient: HttpClient
) {
    private var connected: Boolean = false
    private var lastError: String? = null

    /**
     * Connect to MCP server
     */
    suspend fun connect(): Result<Unit> = try {
        when (config.transportType) {
            "stdio" -> {
                // For stdio transport, we would need process management
                // This is platform-specific and handled differently on Android
                // For now, we mark as connected after validation
                if (config.serverCommand.isNullOrEmpty()) {
                    throw IllegalArgumentException("serverCommand required for stdio transport")
                }
                connected = true
                Result.success(Unit)
            }
            "http", "sse" -> {
                // For HTTP/SSE, verify connectivity
                if (config.serverUrl.isNullOrEmpty()) {
                    throw IllegalArgumentException("serverUrl required for HTTP/SSE transport")
                }
                // Test connectivity
                val response = httpClient.get(config.serverUrl!!)
                if (response.status.value in 200..299) {
                    connected = true
                    Result.success(Unit)
                } else {
                    throw Exception("Server returned status ${response.status}")
                }
            }
            else -> throw Exception("Unknown transport type: ${config.transportType}")
        }
    } catch (e: Exception) {
        lastError = e.message ?: "Unknown error"
        Result.failure(e)
    }

    /**
     * Disconnect from MCP server
     */
    suspend fun disconnect(): Result<Unit> = try {
        connected = false
        Result.success(Unit)
    } catch (e: Exception) {
        Result.failure(e)
    }

    /**
     * List available tools on the MCP server
     */
    suspend fun listTools(): Result<List<McpToolDefinition>> = try {
        if (!connected) {
            throw Exception("Client not connected")
        }

        return when (config.transportType) {
            "http", "sse" -> {
                val toolsUrl = "${config.serverUrl}/tools"
                val response = httpClient.get(toolsUrl)
                val body = response.bodyAsText()
                val json = Json.parseToJsonElement(body).jsonObject
                val toolsArray = json["tools"]?.jsonArray ?: emptyList()
                
                val tools = toolsArray.mapNotNull { element ->
                    val toolObj = element.jsonObject
                    McpToolDefinition(
                        name = toolObj["name"]?.jsonPrimitive?.content ?: return@mapNotNull null,
                        description = toolObj["description"]?.jsonPrimitive?.content ?: "",
                        inputSchema = parseInputSchema(toolObj["inputSchema"])
                    )
                }
                Result.success(tools)
            }
            else -> Result.success(emptyList())
        }
    } catch (e: Exception) {
        lastError = e.message ?: "Unknown error"
        Result.failure(e)
    }

    /**
     * Call a tool on the MCP server
     */
    suspend fun callTool(toolName: String, arguments: Map<String, Any?>): Result<McpToolResult> = try {
        if (!connected) {
            throw Exception("Client not connected")
        }

        return when (config.transportType) {
            "http", "sse" -> {
                val callUrl = "${config.serverUrl}/tools/call"
                val payload = mapOf(
                    "tool_name" to toolName,
                    "arguments" to arguments
                )
                
                val response = httpClient.post(callUrl) {
                    contentType(ContentType.Application.Json)
                    // Note: In a real implementation, we'd use proper serialization
                    // For now, we return success placeholder
                }
                
                if (response.status.value in 200..299) {
                    Result.success(McpToolResult(success = true))
                } else {
                    Result.success(McpToolResult(success = false, error = "Call failed"))
                }
            }
            else -> Result.success(McpToolResult(success = false, error = "Unsupported transport"))
        }
    } catch (e: Exception) {
        lastError = e.message ?: "Unknown error"
        Result.failure(e)
    }

    /**
     * Get connection status
     */
    fun isConnected(): Boolean = connected

    /**
     * Get last error message
     */
    fun getLastError(): String? = lastError

    /**
     * Parse input schema from JSON element
     */
    private fun parseInputSchema(element: JsonElement?): McpInputSchema {
        if (element == null) return McpInputSchema()
        
        val obj = element.jsonObject
        val type = obj["type"]?.jsonPrimitive?.content ?: "object"
        val properties = mutableMapOf<String, Map<String, String>>()
        
        obj["properties"]?.jsonObject?.forEach { (key, value) ->
            properties[key] = mapOf("type" to (value.jsonObject["type"]?.jsonPrimitive?.content ?: "string"))
        }
        
        val required = obj["required"]?.jsonArray?.mapNotNull { it.jsonPrimitive.content }
        
        return McpInputSchema(
            type = type,
            properties = properties,
            required = required
        )
    }
}
