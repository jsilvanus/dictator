/**
 * Tool Registry
 * Manages registration and discovery of available tools
 */
package com.dictator.core.data.tools

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Tool registry for managing available tools
 */
class ToolRegistry {
    
    private val tools = mutableMapOf<String, RegisteredTool>()
    private val mutex = Mutex()

    /**
     * Register a tool
     */
    suspend fun registerTool(tool: RegisteredTool): Result<Unit> = mutex.withLock {
        return try {
            if (tools.containsKey(tool.name)) {
                return Result.failure(Exception("Tool '${tool.name}' already registered"))
            }
            tools[tool.name] = tool
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Unregister a tool
     */
    suspend fun unregisterTool(toolName: String): Result<Unit> = mutex.withLock {
        return try {
            tools.remove(toolName)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get a tool by name
     */
    suspend fun getTool(name: String): RegisteredTool? = mutex.withLock {
        return tools[name]
    }

    /**
     * Get all registered tools
     */
    suspend fun getAllTools(): List<RegisteredTool> = mutex.withLock {
        return tools.values.toList()
    }

    /**
     * Get tools by type
     */
    suspend fun getToolsByType(type: String): List<RegisteredTool> = mutex.withLock {
        return tools.values.filter { it.toolType == type }
    }

    /**
     * Check if tool exists
     */
    suspend fun hasTool(name: String): Boolean = mutex.withLock {
        return tools.containsKey(name)
    }

    /**
     * Get tool count
     */
    suspend fun getToolCount(): Int = mutex.withLock {
        return tools.size
    }

    /**
     * Clear all tools
     */
    suspend fun clearAllTools() = mutex.withLock {
        tools.clear()
    }

    /**
     * Search tools by name or description
     */
    suspend fun searchTools(query: String): List<RegisteredTool> = mutex.withLock {
        val lowerQuery = query.lowercase()
        return tools.values.filter { 
            it.name.lowercase().contains(lowerQuery) ||
            it.description.lowercase().contains(lowerQuery)
        }
    }

    /**
     * Register multiple tools
     */
    suspend fun registerTools(tools: List<RegisteredTool>): Result<Unit> = mutex.withLock {
        return try {
            tools.forEach { tool ->
                if (this.tools.containsKey(tool.name)) {
                    throw Exception("Tool '${tool.name}' already registered")
                }
                this.tools[tool.name] = tool
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Get tools that require permission
     */
    suspend fun getToolsRequiringPermission(): List<RegisteredTool> = mutex.withLock {
        return tools.values.filter { it.requiresPermission }
    }
}
