/**
 * MCP Client for connecting to Model Context Protocol servers
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import { McpServerConfig, McpToolDefinition, McpToolResult } from './types';

/**
 * MCP Client wrapper
 */
export class McpClient {
  private client: Client | null = null;
  private config: McpServerConfig;
  private transport: StdioClientTransport | null = null;

  constructor(config: McpServerConfig) {
    this.config = config;
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<void> {
    try {
      if (this.config.transportType === 'stdio' && this.config.serverCommand) {
        // Create stdio transport
        this.transport = new StdioClientTransport({
          command: this.config.serverCommand,
          args: this.config.serverArgs || [],
        });

        // Create client with transport
        this.client = new Client(
          {
            name: `dictator-client-${this.config.name}`,
            version: '1.0.0',
          },
          {
            capabilities: {},
          }
        );

        // Connect the client
        await this.client.connect(this.transport);
      } else if (this.config.transportType === 'http' || this.config.transportType === 'sse') {
        throw new Error(
          `Transport type '${this.config.transportType}' not yet implemented. Use 'stdio' for now.`
        );
      } else {
        throw new Error(`Unknown transport type: ${this.config.transportType}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to MCP server '${this.config.name}': ${errorMsg}`);
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        // Gracefully close connection
        await this.client.close();
        this.client = null;
      }
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }
    } catch (error) {
      console.error(
        `Error disconnecting from MCP server '${this.config.name}':`,
        error
      );
    }
  }

  /**
   * List available tools on the MCP server
   */
  async listTools(): Promise<McpToolDefinition[]> {
    if (!this.client) {
      throw new Error(`Client not connected for server '${this.config.name}'`);
    }

    try {
      const result = (await this.client.request(
        { method: 'tools/list' } as any,
        {} as any
      )) as { tools?: Array<{ name: string; description?: string; inputSchema?: any }> };

      return (result.tools || []).map((tool) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema || {
          type: 'object',
          properties: {},
        },
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list tools from MCP server '${this.config.name}': ${errorMsg}`);
    }
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(toolName: string, arguments_: Record<string, unknown>): Promise<McpToolResult> {
    if (!this.client) {
      return {
        success: false,
        error: `Client not connected for server '${this.config.name}'`,
      };
    }

    try {
      const result = await this.client.request(
        {
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: arguments_,
          },
        } as any,
        {} as any
      );

      return {
        success: true,
        result,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to call tool '${toolName}' on MCP server '${this.config.name}': ${errorMsg}`,
      };
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.client !== null;
  }

  /**
   * Get server configuration
   */
  getConfig(): McpServerConfig {
    return this.config;
  }
}

/**
 * Create MCP client from config
 */
export async function createMcpClient(config: McpServerConfig): Promise<McpClient> {
  const client = new McpClient(config);
  await client.connect();
  return client;
}
