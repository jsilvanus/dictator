/**
 * MCP Servers API Endpoints
 * GET /api/ai/mcp/servers - List configured MCP servers
 * POST /api/ai/mcp/servers - Add new MCP server
 * PUT /api/ai/mcp/servers/:id - Update MCP server
 * DELETE /api/ai/mcp/servers/:id - Remove MCP server
 */

import { and,eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { registerMcpServer, unregisterMcpServer } from '@/lib/ai/mcp/registry';
import { McpServerConfig } from '@/lib/ai/mcp/types';
import { db } from '@/lib/db';
import { mcpServers } from '@/lib/db/schema';

/**
 * GET /api/ai/mcp/servers - List all MCP servers for the user
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get from database
    const servers = await db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.userId, session.user.id));

    // Convert to response format with safe JSON parsing
    const response = servers.map((server) => {
      let parsedArgs: any = undefined;
      if (server.serverArgs) {
        try {
          parsedArgs = JSON.parse(server.serverArgs);
        } catch (e) {
          console.error(`Failed to parse serverArgs for server ${server.id}:`, e);
          // Return empty object instead of crashing
          parsedArgs = {};
        }
      }
      
      return {
        id: server.id,
        name: server.name,
        enabled: server.enabled,
        transportType: server.transportType,
        serverCommand: server.serverCommand,
        serverArgs: parsedArgs,
        serverUrl: server.serverUrl,
        createdAt: server.createdAt,
        updatedAt: server.updatedAt,
      };
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    return NextResponse.json({ error: 'Failed to fetch MCP servers' }, { status: 500 });
  }
}

/**
 * POST /api/ai/mcp/servers - Create a new MCP server
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, transportType, serverCommand, serverArgs, serverUrl } = body;

    if (!name || !transportType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, transportType' },
        { status: 400 }
      );
    }

    if (transportType === 'stdio' && !serverCommand) {
      return NextResponse.json(
        { error: 'serverCommand is required for stdio transport' },
        { status: 400 }
      );
    }

    if ((transportType === 'http' || transportType === 'sse') && !serverUrl) {
      return NextResponse.json(
        { error: 'serverUrl is required for http/sse transport' },
        { status: 400 }
      );
    }

    // Create unique ID
    const serverId = `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert into database
    const serverRecord = {
      id: serverId,
      userId: session.user.id,
      name,
      enabled: true,
      transportType,
      serverCommand,
      serverArgs: serverArgs ? JSON.stringify(serverArgs) : null,
      serverUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(mcpServers).values(serverRecord);

    // Try to register the server
    try {
      const config: McpServerConfig = {
        id: serverId,
        userId: session.user.id,
        name,
        enabled: true,
        transportType: transportType as any,
        serverCommand,
        serverArgs,
        serverUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await registerMcpServer(config);
    } catch (error) {
      // Server registration failed, but we still saved it to the database
      console.error('Failed to register MCP server:', error);
      // Return warning but still return 201
    }

    return NextResponse.json(
      {
        id: serverId,
        name,
        enabled: true,
        transportType,
        serverCommand,
        serverArgs,
        serverUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating MCP server:', error);
    return NextResponse.json({ error: 'Failed to create MCP server' }, { status: 500 });
  }
}

/**
 * PUT /api/ai/mcp/servers/:id - Update an MCP server
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const serverId = url.pathname.split('/').pop();

    if (!serverId) {
      return NextResponse.json({ error: 'Server ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { enabled, serverCommand, serverArgs, serverUrl, name } = body;

    // Update in database
    await db
      .update(mcpServers)
      .set({
        enabled,
        serverCommand,
        serverArgs: serverArgs ? JSON.stringify(serverArgs) : undefined,
        serverUrl,
        name,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(mcpServers.id, serverId),
          eq(mcpServers.userId, session.user.id)
        )
      );

    const updated = await db
      .select()
      .from(mcpServers)
      .where(
        and(
          eq(mcpServers.id, serverId),
          eq(mcpServers.userId, session.user.id)
        )
      );

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    const server = updated[0];
    
    let parsedArgs: any = undefined;
    if (server.serverArgs) {
      try {
        parsedArgs = JSON.parse(server.serverArgs);
      } catch (e) {
        console.error(`Failed to parse serverArgs for server ${server.id}:`, e);
        parsedArgs = {};
      }
    }

    return NextResponse.json({
      id: server.id,
      name: server.name,
      enabled: server.enabled,
      transportType: server.transportType,
      serverCommand: server.serverCommand,
      serverArgs: parsedArgs,
      serverUrl: server.serverUrl,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
    });
  } catch (error) {
    console.error('Error updating MCP server:', error);
    return NextResponse.json({ error: 'Failed to update MCP server' }, { status: 500 });
  }
}

/**
 * DELETE /api/ai/mcp/servers/:id - Delete an MCP server
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const serverId = url.pathname.split('/').pop();

    if (!serverId) {
      return NextResponse.json({ error: 'Server ID required' }, { status: 400 });
    }

    // Delete from database
    await db.delete(mcpServers).where(
      and(
        eq(mcpServers.id, serverId),
        eq(mcpServers.userId, session.user.id)
      )
    );

    // Try to unregister the server
    try {
      await unregisterMcpServer(serverId);
    } catch (error) {
      console.error('Error unregistering MCP server:', error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting MCP server:', error);
    return NextResponse.json({ error: 'Failed to delete MCP server' }, { status: 500 });
  }
}
