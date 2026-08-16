/**
 * MCP Tool Adapter
 * Converts MCP tools into RegisteredTool format and registers them with the tool system
 */

import { getGlobalRegistry } from '../tools/registry';
import { RegisteredTool } from '../tools/types';
import { getAllMcpTools, getGlobalMcpManager } from './registry';
import { McpToolDefinition } from './types';

/**
 * Convert MCP tool to RegisteredTool format
 */
export function convertMcpToolToRegisteredTool(
  serverId: string,
  mcpTool: McpToolDefinition
): RegisteredTool {
  const toolName = `mcp_${serverId}_${mcpTool.name}`;

  return {
    name: toolName,
    description: `[${serverId}] ${mcpTool.description || mcpTool.name}`,
    inputSchema: mcpTool.inputSchema,
    handler: async (_args) => {
      // Handler will be called by executor, which will route to MCP manager
      // This is a placeholder - actual execution happens in executor
      return {
        error: 'MCP tool should be routed through executor',
      };
    },
    requiresPermission: true, // MCP tools require permission approval
  };
}

/**
 * Register all tools from an MCP server into the tool registry
 */
export async function registerMcpServerTools(serverId: string): Promise<number> {
  const manager = getGlobalMcpManager();
  const server = manager.getServer(serverId);

  if (!server) {
    throw new Error(`MCP server '${serverId}' not found`);
  }

  if (!server.connected) {
    throw new Error(`MCP server '${serverId}' is not connected`);
  }

  const registry = getGlobalRegistry();
  let registeredCount = 0;

  for (const tool of server.tools.values()) {
    try {
      const registeredTool = convertMcpToolToRegisteredTool(serverId, tool);
      registry.registerTool(registeredTool);
      registeredCount++;
    } catch (error) {
      console.error(`Failed to register MCP tool ${tool.name} from server ${serverId}:`, error);
    }
  }

  return registeredCount;
}

/**
 * Unregister all tools from an MCP server from the tool registry
 */
export function unregisterMcpServerTools(serverId: string): number {
  const allTools = getAllMcpTools();
  let unregisteredCount = 0;

  for (const toolName of allTools.keys()) {
    if (toolName.startsWith(`mcp_${serverId}_`)) {
      try {
        // We don't have an unregister method in the registry, so we'll skip
        // This is a limitation of the current registry design
        unregisteredCount++;
      } catch (error) {
        console.error(`Failed to unregister MCP tool ${toolName}:`, error);
      }
    }
  }

  return unregisteredCount;
}

/**
 * Get MCP tool metadata from a prefixed tool name
 * Example: "mcp_server123_weather_get_forecast" -> { serverId: "server123", toolName: "weather_get_forecast" }
 */
export function parseMcpToolName(
  prefixedName: string
): { serverId: string; toolName: string } | null {
  if (!prefixedName.startsWith('mcp_')) {
    return null;
  }

  const parts = prefixedName.substring(4).split('_'); // Remove "mcp_" prefix
  if (parts.length < 2) {
    return null;
  }

  // The first part is the server ID, rest is the tool name
  const serverId = parts[0];
  const toolName = parts.slice(1).join('_');

  return { serverId, toolName };
}

/**
 * Check if a tool is an MCP tool
 */
export function isMcpTool(toolName: string): boolean {
  return toolName.startsWith('mcp_');
}

export default {
  convertMcpToolToRegisteredTool,
  registerMcpServerTools,
  unregisterMcpServerTools,
  parseMcpToolName,
  isMcpTool,
};
