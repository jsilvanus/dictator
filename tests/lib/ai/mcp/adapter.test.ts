/**
 * Tests for MCP Tool Adapter
 */

import { describe, it, expect } from 'vitest';
import {
  convertMcpToolToRegisteredTool,
  parseMcpToolName,
  isMcpTool,
} from '@/lib/ai/mcp/adapter';
import { McpToolDefinition } from '@/lib/ai/mcp/types';

describe('MCP Tool Adapter', () => {
  describe('convertMcpToolToRegisteredTool', () => {
    it('should convert MCP tool to RegisteredTool format', () => {
      const mcpTool: McpToolDefinition = {
        name: 'weather_get',
        description: 'Get current weather',
        inputSchema: {
          type: 'object',
          properties: {
            location: { type: 'string' },
            unit: { type: 'string', enum: ['C', 'F'] },
          },
          required: ['location'],
        },
      };

      const registered = convertMcpToolToRegisteredTool('weather-server', mcpTool);

      expect(registered.name).toBe('mcp_weather-server_weather_get');
      expect(registered.description).toContain('weather-server');
      expect(registered.description).toContain('Get current weather');
      expect(registered.inputSchema.properties).toEqual(mcpTool.inputSchema.properties);
      expect(registered.requiresPermission).toBe(true);
    });

    it('should handle tools without description', () => {
      const mcpTool: McpToolDefinition = {
        name: 'simple_tool',
        description: '',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      };

      const registered = convertMcpToolToRegisteredTool('my-server', mcpTool);

      expect(registered.description).toContain('my-server');
      expect(registered.name).toBe('mcp_my-server_simple_tool');
    });
  });

  describe('parseMcpToolName', () => {
    it('should parse prefixed tool name correctly', () => {
      const result = parseMcpToolName('mcp_server123_weather_get');

      expect(result).toEqual({
        serverId: 'server123',
        toolName: 'weather_get',
      });
    });

    it('should handle tool names with multiple underscores', () => {
      const result = parseMcpToolName('mcp_srv_complex_tool_name_v2');

      expect(result).toEqual({
        serverId: 'srv',
        toolName: 'complex_tool_name_v2',
      });
    });

    it('should return null for non-MCP tool names', () => {
      expect(parseMcpToolName('http_get')).toBeNull();
      expect(parseMcpToolName('text_edit')).toBeNull();
      expect(parseMcpToolName('regular_tool')).toBeNull();
    });

    it('should return null for malformed MCP names', () => {
      expect(parseMcpToolName('mcp_')).toBeNull();
      expect(parseMcpToolName('mcp_single')).toBeNull();
    });
  });

  describe('isMcpTool', () => {
    it('should identify MCP tools correctly', () => {
      expect(isMcpTool('mcp_server_tool')).toBe(true);
      expect(isMcpTool('mcp_123_complex_name')).toBe(true);
    });

    it('should reject non-MCP tools', () => {
      expect(isMcpTool('http_get')).toBe(false);
      expect(isMcpTool('text_edit')).toBe(false);
      expect(isMcpTool('get_document')).toBe(false);
      expect(isMcpTool('mcp')).toBe(false);
    });
  });
});
