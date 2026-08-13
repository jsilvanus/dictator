/**
 * MCP Server Registry and Manager
 * Manages multiple MCP server connections and tool registration
 */

import { McpClient } from './client';
import { McpServerConfig, McpServerState, McpToolDefinition } from './types';

/**
 * MCP Server Manager - manages connections to multiple MCP servers
 */
export class McpServerManager {
  private servers: Map<string, McpServerState> = new Map();
  private clients: Map<string, McpClient> = new Map();

  /**
   * Register and connect to an MCP server
   */
  async registerServer(config: McpServerConfig): Promise<void> {
    // Check if already registered
    if (this.servers.has(config.id)) {
      throw new Error(`MCP server with ID '${config.id}' already registered`);
    }

    try {
      // Create and connect client
      const client = new McpClient(config);
      await client.connect();

      // Discover tools
      const tools = await client.listTools();
      const toolsMap = new Map<string, McpToolDefinition>();
      tools.forEach((tool) => {
        toolsMap.set(tool.name, tool);
      });

      // Store server state
      const serverState: McpServerState = {
        config,
        connected: true,
        tools: toolsMap,
        lastConnectAttempt: new Date(),
      };

      this.servers.set(config.id, serverState);
      this.clients.set(config.id, client);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const serverState: McpServerState = {
        config,
        connected: false,
        lastError: errorMsg,
        lastConnectAttempt: new Date(),
        tools: new Map(),
      };
      this.servers.set(config.id, serverState);
      throw error;
    }
  }

  /**
   * Unregister and disconnect from an MCP server
   */
  async unregisterServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      await client.disconnect();
      this.clients.delete(serverId);
    }

    this.servers.delete(serverId);
  }

  /**
   * Get a registered server's state
   */
  getServer(serverId: string): McpServerState | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Get all registered servers
   */
  getAllServers(): McpServerState[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get a specific tool definition from a server
   */
  getTool(serverId: string, toolName: string): McpToolDefinition | undefined {
    const server = this.servers.get(serverId);
    return server?.tools.get(toolName);
  }

  /**
   * Get all tools from all servers, prefixed with server ID
   */
  getAllTools(): Map<string, { serverId: string; tool: McpToolDefinition }> {
    const result = new Map<string, { serverId: string; tool: McpToolDefinition }>();

    for (const [serverId, server] of this.servers) {
      for (const [toolName, tool] of server.tools) {
        const prefixedName = `mcp_${serverId}_${toolName}`;
        result.set(prefixedName, { serverId, tool });
      }
    }

    return result;
  }

  /**
   * Call a tool on a specific server
   */
  async callTool(
    serverId: string,
    toolName: string,
    arguments_: Record<string, unknown>
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const client = this.clients.get(serverId);
    if (!client) {
      return {
        success: false,
        error: `MCP server '${serverId}' not connected`,
      };
    }

    return client.callTool(toolName, arguments_);
  }

  /**
   * Disconnect all servers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values()).map((client) =>
      client.disconnect()
    );
    await Promise.all(disconnectPromises);

    this.clients.clear();
    this.servers.clear();
  }

  /**
   * Get server count
   */
  getServerCount(): number {
    return this.servers.size;
  }

  /**
   * Check if a server is connected
   */
  isServerConnected(serverId: string): boolean {
    const server = this.servers.get(serverId);
    return server?.connected || false;
  }
}

/**
 * Global singleton instance of MCP Server Manager
 */
let globalManager: McpServerManager | null = null;

/**
 * Get or create the global MCP Server Manager instance
 */
export function getGlobalMcpManager(): McpServerManager {
  if (!globalManager) {
    globalManager = new McpServerManager();
  }
  return globalManager;
}

/**
 * Convenience functions for global manager
 */
export async function registerMcpServer(config: McpServerConfig): Promise<void> {
  return getGlobalMcpManager().registerServer(config);
}

export async function unregisterMcpServer(serverId: string): Promise<void> {
  return getGlobalMcpManager().unregisterServer(serverId);
}

export function getMcpServer(serverId: string): McpServerState | undefined {
  return getGlobalMcpManager().getServer(serverId);
}

export function getAllMcpServers(): McpServerState[] {
  return getGlobalMcpManager().getAllServers();
}

export function getAllMcpTools(): Map<string, { serverId: string; tool: McpToolDefinition }> {
  return getGlobalMcpManager().getAllTools();
}

export async function callMcpTool(
  serverId: string,
  toolName: string,
  arguments_: Record<string, unknown>
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  return getGlobalMcpManager().callTool(serverId, toolName, arguments_);
}

export async function disconnectAllMcpServers(): Promise<void> {
  return getGlobalMcpManager().disconnectAll();
}

export default getGlobalMcpManager;
