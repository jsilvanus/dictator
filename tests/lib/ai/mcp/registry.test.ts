/**
 * Tests for MCP Server Manager and Registry
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { McpServerManager } from '@/lib/ai/mcp/registry';
import { McpServerConfig } from '@/lib/ai/mcp/types';
import { McpClient } from '@/lib/ai/mcp/client';

// Mock MCP client
vi.mock('@/lib/ai/mcp/client', () => ({
  McpClient: vi.fn(),
  createMcpClient: vi.fn(),
}));

describe('MCP Server Manager', () => {
  let manager: McpServerManager;

  beforeEach(() => {
    manager = new McpServerManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Server Registration', () => {
    it('should register a server and store its configuration', async () => {
      const config: McpServerConfig = {
        id: 'test-server-1',
        userId: 'user-123',
        name: 'Test Server',
        enabled: true,
        transportType: 'stdio',
        serverCommand: 'test-command',
        serverArgs: ['arg1'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock client
      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue([
          {
            name: 'test_tool',
            description: 'A test tool',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ]),
        isConnected: vi.fn().mockReturnValue(true),
        disconnect: vi.fn().mockResolvedValue(undefined),
        getConfig: vi.fn().mockReturnValue(config),
      };

      vi.mocked(McpClient).mockImplementation(() => mockClient as any);

      await manager.registerServer(config);

      const server = manager.getServer('test-server-1');
      expect(server).toBeDefined();
      expect(server?.config.name).toBe('Test Server');
      expect(server?.connected).toBe(true);
      expect(server?.tools.size).toBe(1);
    });

    it('should throw error when registering duplicate server', async () => {
      const config: McpServerConfig = {
        id: 'test-server-1',
        userId: 'user-123',
        name: 'Test Server',
        enabled: true,
        transportType: 'stdio',
        serverCommand: 'test-command',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(McpClient).mockImplementation(() => mockClient as any);

      await manager.registerServer(config);
      await expect(manager.registerServer(config)).rejects.toThrow(
        "MCP server with ID 'test-server-1' already registered"
      );
    });
  });

  describe('Tool Management', () => {
    beforeEach(async () => {
      const config: McpServerConfig = {
        id: 'test-server-1',
        userId: 'user-123',
        name: 'Test Server',
        enabled: true,
        transportType: 'stdio',
        serverCommand: 'test-command',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue([
          {
            name: 'weather_get',
            description: 'Get weather',
            inputSchema: {
              type: 'object',
              properties: { location: { type: 'string' } },
              required: ['location'],
            },
          },
          {
            name: 'weather_forecast',
            description: 'Get forecast',
            inputSchema: {
              type: 'object',
              properties: { location: { type: 'string' } },
              required: ['location'],
            },
          },
        ]),
      };

      vi.mocked(McpClient).mockImplementation(() => mockClient as any);

      await manager.registerServer(config);
    });

    it('should get all tools with prefixed names', () => {
      const allTools = manager.getAllTools();
      expect(allTools.size).toBe(2);
      expect(allTools.has('mcp_test-server-1_weather_get')).toBe(true);
      expect(allTools.has('mcp_test-server-1_weather_forecast')).toBe(true);
    });

    it('should get specific tool from server', () => {
      const tool = manager.getTool('test-server-1', 'weather_get');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('weather_get');
      expect(tool?.description).toBe('Get weather');
    });

    it('should return undefined for non-existent tool', () => {
      const tool = manager.getTool('test-server-1', 'non_existent');
      expect(tool).toBeUndefined();
    });
  });

  describe('Server Unregistration', () => {
    beforeEach(async () => {
      const config: McpServerConfig = {
        id: 'test-server-1',
        userId: 'user-123',
        name: 'Test Server',
        enabled: true,
        transportType: 'stdio',
        serverCommand: 'test-command',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue([]),
        disconnect: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(McpClient).mockImplementation(() => mockClient as any);

      await manager.registerServer(config);
    });

    it('should unregister a server and disconnect', async () => {
      expect(manager.getServer('test-server-1')).toBeDefined();

      await manager.unregisterServer('test-server-1');

      expect(manager.getServer('test-server-1')).toBeUndefined();
    });
  });

  describe('Connection Status', () => {
    it('should report connection status', async () => {
      const config: McpServerConfig = {
        id: 'test-server-1',
        userId: 'user-123',
        name: 'Test Server',
        enabled: true,
        transportType: 'stdio',
        serverCommand: 'test-command',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(McpClient).mockImplementation(() => mockClient as any);

      await manager.registerServer(config);

      expect(manager.isServerConnected('test-server-1')).toBe(true);
      expect(manager.isServerConnected('non-existent')).toBe(false);
    });
  });
});
