/**
 * API client for tool execution
 * Provides methods for checking tool availability and executing tools
 */

import { ToolCall, ToolResult, AiTool } from '@/lib/ai/providers/types';
import { ToolExecutionContext } from '@/lib/ai/tools/types';

/**
 * Client-side errors when calling tool APIs
 */
export class ToolApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly target?: string,
  ) {
    super(message);
    this.name = 'ToolApiError';
  }
}

/**
 * Tool API client
 * Communicates with backend to execute tools and manage permissions
 */
export class ToolApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/ai') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get list of available tools
   */
  async getAvailableTools(): Promise<AiTool[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tools`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new ToolApiError(
          `Failed to fetch tools: ${response.statusText}`,
          'fetch_tools_failed',
          response.status,
        );
      }

      const data = (await response.json()) as { tools: AiTool[] };
      return data.tools;
    } catch (error) {
      if (error instanceof ToolApiError) throw error;
      throw new ToolApiError(
        `Failed to fetch tools: ${error instanceof Error ? error.message : String(error)}`,
        'fetch_tools_error',
      );
    }
  }

  /**
   * Execute a tool call
   */
  async executeTool(
    toolCall: ToolCall,
    documentId?: string,
  ): Promise<ToolResult> {
    try {
      const response = await fetch(`${this.baseUrl}/execute-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolCall,
          documentId,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as {
          error?: string;
          code?: string;
          target?: string;
        };
        throw new ToolApiError(
          errorData.error || `Tool execution failed: ${response.statusText}`,
          errorData.code || 'execution_failed',
          response.status,
          errorData.target,
        );
      }

      return (await response.json()) as ToolResult;
    } catch (error) {
      if (error instanceof ToolApiError) throw error;
      throw new ToolApiError(
        `Tool execution error: ${error instanceof Error ? error.message : String(error)}`,
        'execution_error',
      );
    }
  }

  /**
   * Grant permission for a tool target
   */
  async grantPermission(
    target: string,
    toolType: 'http' | 'mcp',
    mode: 'once' | 'per-document' | 'always',
    documentId?: string,
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          toolType,
          mode,
          documentId,
        }),
      });

      if (!response.ok) {
        throw new ToolApiError(
          `Failed to grant permission: ${response.statusText}`,
          'grant_permission_failed',
          response.status,
        );
      }
    } catch (error) {
      if (error instanceof ToolApiError) throw error;
      throw new ToolApiError(
        `Failed to grant permission: ${error instanceof Error ? error.message : String(error)}`,
        'grant_permission_error',
      );
    }
  }

  /**
   * List user's tool permissions
   */
  async listPermissions(): Promise<
    Array<{
      target: string;
      toolType: 'http' | 'mcp';
      mode: 'once' | 'per-document' | 'always';
      documentId?: string;
      createdAt: string;
      expiresAt?: string;
    }>
  > {
    try {
      const response = await fetch(`${this.baseUrl}/permissions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new ToolApiError(
          `Failed to fetch permissions: ${response.statusText}`,
          'fetch_permissions_failed',
          response.status,
        );
      }

      const data = (await response.json()) as {
        permissions: Array<{
          target: string;
          toolType: 'http' | 'mcp';
          mode: 'once' | 'per-document' | 'always';
          documentId?: string;
          createdAt: string;
          expiresAt?: string;
        }>;
      };
      return data.permissions;
    } catch (error) {
      if (error instanceof ToolApiError) throw error;
      throw new ToolApiError(
        `Failed to fetch permissions: ${error instanceof Error ? error.message : String(error)}`,
        'fetch_permissions_error',
      );
    }
  }

  /**
   * Revoke a tool permission
   */
  async revokePermission(target: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/permissions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });

      if (!response.ok) {
        throw new ToolApiError(
          `Failed to revoke permission: ${response.statusText}`,
          'revoke_permission_failed',
          response.status,
        );
      }
    } catch (error) {
      if (error instanceof ToolApiError) throw error;
      throw new ToolApiError(
        `Failed to revoke permission: ${error instanceof Error ? error.message : String(error)}`,
        'revoke_permission_error',
      );
    }
  }
}

// Export singleton instance
export const toolApiClient = new ToolApiClient();
