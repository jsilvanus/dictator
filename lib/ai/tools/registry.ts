/**
 * Central tool registry for managing AI tool functions
 * Handles registration, retrieval, and permission checking for tools
 */

import { AiTool } from '../providers/types';
import { RegisteredTool } from './types';

/**
 * Central registry for all available tools
 * Maintains a map of tool names to their implementations
 */
class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  /**
   * Register a tool in the registry
   * @param tool - The tool to register
   * @throws Error if tool with same name already exists
   */
  registerTool(tool: RegisteredTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Retrieve a tool by name
   * @param name - The tool name
   * @returns The registered tool or undefined if not found
   */
  getTool(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools as AiTool[] for API consumption
   * @returns Array of AiTool objects for use in API requests
   */
  getAllTools(): AiTool[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Check if a tool exists
   * @param name - The tool name
   * @returns True if tool is registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Check if a user has permission to execute a tool
   * @param userId - The user ID
   * @param toolName - The tool name
   * @returns True if user has permission (all built-in tools allowed for now)
   */
  async hasToolPermission(userId: string, toolName: string): Promise<boolean> {
    if (!this.hasTool(toolName)) {
      return false;
    }

    // For now, all authenticated users can use all registered tools
    // In the future, this can be extended with ACLs
    return !!userId;
  }

  /**
   * Get the number of registered tools
   * @returns Count of registered tools
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Get all tools that require permission
   * @returns Array of tool names requiring permission
   */
  getToolsRequiringPermission(): string[] {
    const requiring: string[] = [];
    for (const tool of this.tools.values()) {
      if (tool.requiresPermission) {
        requiring.push(tool.name);
      }
    }
    return requiring;
  }

  /**
   * Clear all tools (mainly for testing)
   */
  clear(): void {
    this.tools.clear();
  }
}

/**
 * Global singleton instance of the tool registry
 */
let globalRegistry: ToolRegistry | null = null;

/**
 * Get or create the global tool registry instance
 * @returns The global ToolRegistry instance
 */
export function getGlobalRegistry(): ToolRegistry {
  if (!globalRegistry) {
    globalRegistry = new ToolRegistry();
  }
  return globalRegistry;
}

/**
 * Register a tool globally
 * @param tool - The tool to register
 */
export function registerTool(tool: RegisteredTool): void {
  getGlobalRegistry().registerTool(tool);
}

/**
 * Get a tool from the global registry
 * @param name - The tool name
 * @returns The registered tool or undefined if not found
 */
export function getTool(name: string): RegisteredTool | undefined {
  return getGlobalRegistry().getTool(name);
}

/**
 * Get all tools from the global registry as AiTool[]
 * @returns Array of AiTool objects
 */
export function getAllTools(): AiTool[] {
  return getGlobalRegistry().getAllTools();
}

/**
 * Check if a tool exists globally
 * @param name - The tool name
 * @returns True if tool is registered
 */
export function hasTool(name: string): boolean {
  return getGlobalRegistry().hasTool(name);
}

/**
 * Check if a user has permission to execute a tool
 * @param userId - The user ID
 * @param toolName - The tool name
 * @returns True if user has permission
 */
export async function hasToolPermission(userId: string, toolName: string): Promise<boolean> {
  return getGlobalRegistry().hasToolPermission(userId, toolName);
}

/**
 * Get all tools that require permission
 * @returns Array of tool names that require permission
 */
export function getToolsRequiringPermission(): string[] {
  return getGlobalRegistry().getToolsRequiringPermission();
}

export default getGlobalRegistry;
