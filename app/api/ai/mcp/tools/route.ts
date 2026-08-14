/**
 * MCP Tools API Endpoint
 * GET /api/ai/mcp/tools - List tools from all MCP servers
 * POST /api/ai/mcp/test-connection - Test a server connection
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { getAllMcpTools,getGlobalMcpManager } from '@/lib/ai/mcp/registry';

/**
 * GET /api/ai/mcp/tools - List all tools from all connected MCP servers
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allTools = getAllMcpTools();
    const toolsList = Array.from(allTools.entries()).map(([prefixedName, { serverId, tool }]) => ({
      name: prefixedName,
      displayName: tool.name,
      serverId,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    return NextResponse.json({
      tools: toolsList,
      total: toolsList.length,
    });
  } catch (error) {
    console.error('Error fetching MCP tools:', error);
    return NextResponse.json({ error: 'Failed to fetch MCP tools' }, { status: 500 });
  }
}

/**
 * POST /api/ai/mcp/test-connection - Test connection to an MCP server
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { serverName } = body;

    if (!serverName) {
      return NextResponse.json(
        { error: 'serverName is required' },
        { status: 400 }
      );
    }

    const manager = getGlobalMcpManager();
    const server = manager.getServer(serverName);

    if (!server) {
      return NextResponse.json(
        { error: `Server '${serverName}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      serverId: server.config.id,
      name: server.config.name,
      connected: server.connected,
      error: server.lastError,
      toolCount: server.tools.size,
      tools: Array.from(server.tools.keys()),
    });
  } catch (error) {
    console.error('Error testing MCP server connection:', error);
    return NextResponse.json({ error: 'Failed to test connection' }, { status: 500 });
  }
}
