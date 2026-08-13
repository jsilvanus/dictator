/**
 * Generic tool executor for executing registered tools
 * Handles execution, error handling, rate limiting, and audit logging
 */

import { ToolCall, ToolResult } from '../providers/types';
import { ToolExecutionContext } from './types';
import { getTool, hasToolPermission } from './registry';

/**
 * Rate limit tracking for individual tools
 */
interface ToolRateLimit {
  toolName: string;
  userId: string;
  callCount: number;
  resetTime: number;
}

/**
 * Audit log entry for tool execution
 */
interface ToolAuditLog {
  timestamp: Date;
  userId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  success: boolean;
  error?: string;
  executionTime: number;
}

/**
 * Generic tool executor
 * Executes tools with safety checks, rate limiting, and audit logging
 */
export class ToolExecutor {
  private rateLimits: Map<string, ToolRateLimit> = new Map();
  private auditLogs: ToolAuditLog[] = [];
  private maxCallsPerMinute: number = 100;
  private maxAuditLogs: number = 10000;

  /**
   * Execute a tool call
   * @param toolCall - The tool call to execute
   * @param context - Execution context (user, document, session info)
   * @returns Promise resolving to a ToolResult
   */
  async execute(toolCall: ToolCall, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    const tool = getTool(toolCall.name);

    // Check if tool exists
    if (!tool) {
      const error = `Tool '${toolCall.name}' not found in registry`;
      this.logAudit({
        timestamp: new Date(),
        userId: context.userId,
        toolName: toolCall.name,
        arguments: toolCall.arguments,
        success: false,
        error,
        executionTime: Date.now() - startTime,
      });

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: null,
        error,
      };
    }

    // Check permissions
    const hasPermission = await hasToolPermission(context.userId, toolCall.name);
    if (!hasPermission) {
      const error = `User ${context.userId} does not have permission to execute tool '${toolCall.name}'`;
      this.logAudit({
        timestamp: new Date(),
        userId: context.userId,
        toolName: toolCall.name,
        arguments: toolCall.arguments,
        success: false,
        error,
        executionTime: Date.now() - startTime,
      });

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: null,
        error,
      };
    }

    // Check rate limits
    const rateLimitKey = `${context.userId}:${toolCall.name}`;
    const isRateLimited = this.checkRateLimit(rateLimitKey, context.userId);
    if (isRateLimited) {
      const error = `Rate limit exceeded for tool '${toolCall.name}'`;
      this.logAudit({
        timestamp: new Date(),
        userId: context.userId,
        toolName: toolCall.name,
        arguments: toolCall.arguments,
        success: false,
        error,
        executionTime: Date.now() - startTime,
      });

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: null,
        error,
      };
    }

    // Validate input if tool has safety checker
    if (tool.safetyChecker) {
      try {
        const isSafe = await tool.safetyChecker(toolCall.name, toolCall.arguments);
        if (!isSafe) {
          const error = `Tool '${toolCall.name}' failed safety check`;
          this.logAudit({
            timestamp: new Date(),
            userId: context.userId,
            toolName: toolCall.name,
            arguments: toolCall.arguments,
            success: false,
            error,
            executionTime: Date.now() - startTime,
          });

          return {
            toolCallId: toolCall.id,
            name: toolCall.name,
            result: null,
            error,
          };
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logAudit({
          timestamp: new Date(),
          userId: context.userId,
          toolName: toolCall.name,
          arguments: toolCall.arguments,
          success: false,
          error: `Safety check failed: ${errorMsg}`,
          executionTime: Date.now() - startTime,
        });

        return {
          toolCallId: toolCall.id,
          name: toolCall.name,
          result: null,
          error: `Safety check failed: ${errorMsg}`,
        };
      }
    }

    // Execute the tool
    try {
      const result = await tool.handler(toolCall.arguments, context);

      this.logAudit({
        timestamp: new Date(),
        userId: context.userId,
        toolName: toolCall.name,
        arguments: toolCall.arguments,
        success: true,
        executionTime: Date.now() - startTime,
      });

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      this.logAudit({
        timestamp: new Date(),
        userId: context.userId,
        toolName: toolCall.name,
        arguments: toolCall.arguments,
        success: false,
        error: errorMsg,
        executionTime: Date.now() - startTime,
      });

      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: null,
        error: errorMsg,
      };
    }
  }

  /**
   * Execute multiple tool calls (non-blocking)
   * @param toolCalls - Array of tool calls to execute
   * @param context - Execution context
   * @returns Promise resolving to array of ToolResults
   */
  async executeMultiple(toolCalls: ToolCall[], context: ToolExecutionContext): Promise<ToolResult[]> {
    return Promise.all(toolCalls.map((call) => this.execute(call, context)));
  }

  /**
   * Check rate limit for a user-tool combination
   * @param key - Rate limit key (userId:toolName)
   * @param userId - The user ID
   * @returns True if rate limited, false otherwise
   */
  private checkRateLimit(key: string, userId: string): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(key);

    if (!limit || now > limit.resetTime) {
      // Reset or create new limit
      this.rateLimits.set(key, {
        toolName: key.split(':')[1],
        userId,
        callCount: 1,
        resetTime: now + 60000, // Reset every minute
      });
      return false;
    }

    // Check if exceeded
    if (limit.callCount >= this.maxCallsPerMinute) {
      return true;
    }

    limit.callCount++;
    return false;
  }

  /**
   * Log tool execution to audit trail
   * @param log - The audit log entry
   */
  private logAudit(log: ToolAuditLog): void {
    this.auditLogs.push(log);

    // Keep audit logs bounded
    if (this.auditLogs.length > this.maxAuditLogs) {
      this.auditLogs.shift();
    }
  }

  /**
   * Get audit logs for a specific user and tool
   * @param userId - Optional user ID filter
   * @param toolName - Optional tool name filter
   * @returns Array of matching audit logs
   */
  getAuditLogs(userId?: string, toolName?: string): ToolAuditLog[] {
    return this.auditLogs.filter((log) => {
      if (userId && log.userId !== userId) return false;
      if (toolName && log.toolName !== toolName) return false;
      return true;
    });
  }

  /**
   * Clear audit logs (mainly for testing)
   */
  clearAuditLogs(): void {
    this.auditLogs = [];
  }

  /**
   * Set rate limit parameters
   * @param maxCallsPerMinute - Maximum calls per minute per user-tool
   */
  setRateLimitParams(maxCallsPerMinute: number): void {
    this.maxCallsPerMinute = maxCallsPerMinute;
  }
}

/**
 * Global singleton executor instance
 */
let globalExecutor: ToolExecutor | null = null;

/**
 * Get or create the global executor instance
 * @returns The global ToolExecutor instance
 */
export function getGlobalExecutor(): ToolExecutor {
  if (!globalExecutor) {
    globalExecutor = new ToolExecutor();
  }
  return globalExecutor;
}

/**
 * Execute a tool call using the global executor
 * @param toolCall - The tool call to execute
 * @param context - Execution context
 * @returns Promise resolving to a ToolResult
 */
export async function executeTool(toolCall: ToolCall, context: ToolExecutionContext): Promise<ToolResult> {
  return getGlobalExecutor().execute(toolCall, context);
}

export default getGlobalExecutor;
