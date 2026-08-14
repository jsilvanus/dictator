/**
 * Generic tool executor for executing registered tools
 * Handles execution, error handling, rate limiting, audit logging, and permission checks
 */

import { ToolCall, ToolResult } from '../providers/types';
import { getPermissionManager } from './permissions';
import { getTool } from './registry';
import { ToolExecutionContext } from './types';

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

    // Check permissions for tools that require them
    if (tool.requiresPermission) {
      // Extract target from arguments based on tool name
      let target: string | undefined;
      let toolType: 'http' | 'mcp' = 'http';

      if (toolCall.name.startsWith('http_')) {
        target = toolCall.arguments.url as string;
        toolType = 'http';
      } else if (toolCall.name.startsWith('mcp_')) {
        target = toolCall.name; // MCP tools use their name as target
        toolType = 'mcp';
      }

      if (target) {
        const permissionManager = getPermissionManager();
        const hasPermission = permissionManager.checkPermission(
          context.userId,
          target,
          context.documentId
        );

        if (!hasPermission) {
          const error = `Permission denied: User ${context.userId} is not approved to access '${target}'`;
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
            errorCode: 'permission_denied',
            target, // Include target so UI can prompt for approval
          };
        }
      }
    }

    // Handle MCP tool calls specially
    if (toolCall.name.startsWith('mcp_')) {
      return this.executeMcpTool(toolCall, context, startTime);
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
   * Execute an MCP tool call
   * @param toolCall - The MCP tool call
   * @param context - Execution context
   * @param startTime - Start time for timing
   * @returns Promise resolving to ToolResult
   */
  private async executeMcpTool(
   toolCall: ToolCall,
   context: ToolExecutionContext,
   startTime: number
  ): Promise<ToolResult> {
   try {
     // Parse MCP tool name: mcp_<serverId>_<toolName>
     const parts = toolCall.name.substring(4).split('_'); // Remove "mcp_" prefix
     if (parts.length < 2) {
       const error = `Invalid MCP tool name: ${toolCall.name}`;
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

     const serverId = parts[0];
     const toolName = parts.slice(1).join('_');

     // Dynamically import MCP functions to avoid circular dependency
     const { callMcpTool } = await import('../mcp/registry');
     const result = await callMcpTool(serverId, toolName, toolCall.arguments);

     this.logAudit({
       timestamp: new Date(),
       userId: context.userId,
       toolName: toolCall.name,
       arguments: toolCall.arguments,
       success: result.success,
       error: result.error,
       executionTime: Date.now() - startTime,
     });

     return {
       toolCallId: toolCall.id,
       name: toolCall.name,
       result: result.success ? result.result : null,
       error: result.error,
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
