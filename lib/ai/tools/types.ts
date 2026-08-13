/**
 * Tool execution types and interfaces
 */

/**
 * Signature of a tool function
 */
export type ToolFunction = (args: Record<string, unknown>, context?: ToolExecutionContext) => Promise<unknown>;

/**
 * Context available during tool execution
 */
export type ToolExecutionContext = {
  userId: string;
  documentId?: string;
  sessionId?: string;
  requestId: string;
};

/**
 * Safety check for tool execution
 */
export type ToolSafetyChecker = (toolName: string, args: Record<string, unknown>) => Promise<boolean>;

/**
 * Tool registry entry
 */
export type RegisteredTool = {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: ToolFunction;
  safetyChecker?: ToolSafetyChecker;
  requiresPermission?: boolean;
};

/**
 * Permission approval modes
 */
export type ToolPermissionMode = 'once' | 'per-document' | 'always';

/**
 * Tool permission record
 */
export type ToolPermission = {
  id: string;
  userId: string;
  target: string; // URL for HTTP tools, MCP name for MCP tools
  toolType: 'http' | 'mcp';
  mode: ToolPermissionMode;
  documentId?: string;
  createdAt: Date;
  expiresAt?: Date;
};

/**
 * Permission request from AI tool execution
 */
export type PermissionRequest = {
  userId: string;
  target: string;
  toolType: 'http' | 'mcp';
  reason: string;
  documentId?: string;
};
