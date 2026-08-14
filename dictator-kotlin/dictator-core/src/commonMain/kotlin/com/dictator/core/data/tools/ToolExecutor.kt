/**
 * Tool Executor
 * Executes tools and manages tool execution flow
 */
package com.dictator.core.data.tools

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.uuid.Uuid

/**
 * Tool executor for executing registered tools
 */
class ToolExecutor(
    private val registry: ToolRegistry,
    private val permissionsManager: ToolPermissionsManager
) {
    
    private val executionLogs = mutableListOf<ToolExecutionLog>()
    private val mutex = Mutex()

    /**
     * Execute a tool
     */
    suspend fun executeTool(
        toolName: String,
        arguments: Map<String, Any?>,
        context: ToolExecutionContext
    ): Result<ToolResult> = mutex.withLock {
        return try {
            val tool = registry.getTool(toolName)
                ?: return Result.failure(Exception("Tool not found: $toolName"))

            val startTime = System.currentTimeMillis()

            // Check permissions if needed
            if (tool.requiresPermission) {
                val hasPermission = permissionsManager.hasPermission(
                    context.userId,
                    toolName,
                    tool.toolType,
                    context.documentId
                )
                
                if (!hasPermission) {
                    logExecution(
                        toolName,
                        context.userId,
                        arguments,
                        false,
                        error = "Permission denied",
                        permissionRequired = true
                    )
                    return Result.success(
                        ToolResult(
                            success = false,
                            error = "Permission required to execute tool: $toolName"
                        )
                    )
                }
            }

            // Execute the tool (in a real implementation, would call the handler)
            // For now, return success placeholder
            val result = ToolResult(success = true, result = "Tool executed successfully")
            
            val duration = System.currentTimeMillis() - startTime
            logExecution(
                toolName,
                context.userId,
                arguments,
                true,
                result = result.result,
                duration = duration
            )

            Result.success(result)
        } catch (e: Exception) {
            logExecution(
                toolName,
                context.userId,
                arguments,
                false,
                error = e.message ?: "Unknown error"
            )
            Result.failure(e)
        }
    }

    /**
     * Log tool execution
     */
    private fun logExecution(
        toolName: String,
        userId: String,
        arguments: Map<String, Any?>,
        success: Boolean,
        result: String? = null,
        error: String? = null,
        permissionRequired: Boolean = false,
        duration: Long = 0
    ) {
        // Convert arguments to string map for logging
        val argsMap = arguments.mapValues { (_, v) -> v?.toString() ?: "" }
        
        val log = ToolExecutionLog(
            id = Uuid.random().toString(),
            userId = userId,
            toolName = toolName,
            arguments = argsMap,
            success = success,
            result = result,
            error = error,
            permissionRequired = permissionRequired,
            duration = duration
        )
        
        executionLogs.add(log)
        
        // Keep last 10,000 logs
        if (executionLogs.size > 10000) {
            executionLogs.removeAt(0)
        }
    }

    /**
     * Get execution logs for a tool
     */
    suspend fun getToolLogs(toolName: String): List<ToolExecutionLog> = mutex.withLock {
        return executionLogs.filter { it.toolName == toolName }
    }

    /**
     * Get execution logs for a user
     */
    suspend fun getUserLogs(userId: String): List<ToolExecutionLog> = mutex.withLock {
        return executionLogs.filter { it.userId == userId }
    }

    /**
     * Get all execution logs
     */
    suspend fun getAllLogs(): List<ToolExecutionLog> = mutex.withLock {
        return executionLogs.toList()
    }

    /**
     * Clear execution logs
     */
    suspend fun clearLogs() = mutex.withLock {
        executionLogs.clear()
    }

    /**
     * Get execution statistics
     */
    suspend fun getStatistics(): ToolExecutionStatistics = mutex.withLock {
        val total = executionLogs.size
        val successful = executionLogs.count { it.success }
        val failed = total - successful
        val byTool = executionLogs.groupingBy { it.toolName }.eachCount()
        val byUser = executionLogs.groupingBy { it.userId }.eachCount()
        val avgDuration = if (total > 0) {
            executionLogs.map { it.duration }.average()
        } else {
            0.0
        }

        return ToolExecutionStatistics(
            totalExecutions = total,
            successfulExecutions = successful,
            failedExecutions = failed,
            executionsByTool = byTool,
            executionsByUser = byUser,
            averageDuration = avgDuration.toLong()
        )
    }
}

/**
 * Tool execution statistics
 */
data class ToolExecutionStatistics(
    val totalExecutions: Int,
    val successfulExecutions: Int,
    val failedExecutions: Int,
    val executionsByTool: Map<String, Int>,
    val executionsByUser: Map<String, Int>,
    val averageDuration: Long // ms
) {
    fun getSuccessRate(): Float {
        return if (totalExecutions > 0) {
            (successfulExecutions.toFloat() / totalExecutions) * 100
        } else {
            0f
        }
    }

    fun getTopTools(limit: Int = 5): List<Pair<String, Int>> {
        return executionsByTool.toList()
            .sortedByDescending { it.second }
            .take(limit)
    }
}
