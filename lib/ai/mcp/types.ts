/**
 * MCP (Model Context Protocol) types and interfaces
 */

/**
 * MCP server configuration
 */
export type McpServerConfig = {
  id: string;
  userId: string;
  name: string;
  enabled: boolean;
  transportType: 'stdio' | 'sse' | 'http';
  
  // For stdio transport
  serverCommand?: string;
  serverArgs?: string[];
  
  // For HTTP/SSE transport
  serverUrl?: string;
  
  createdAt: Date;
  updatedAt: Date;
};

/**
 * MCP server state
 */
export type McpServerState = {
  config: McpServerConfig;
  connected: boolean;
  lastError?: string;
  lastConnectAttempt?: Date;
  tools: Map<string, McpToolDefinition>;
};

/**
 * MCP tool definition (converted from MCP protocol)
 */
export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
};

/**
 * MCP tool call request (internal format)
 */
export type McpToolCall = {
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
};

/**
 * MCP tool call result
 */
export type McpToolResult = {
  success: boolean;
  result?: unknown;
  error?: string;
};

/**
 * MCP server registry entry
 */
export type McpServerRegistry = {
  servers: Map<string, McpServerState>;
  initialized: boolean;
};
