# MCP (Model Context Protocol) Implementation Guide

## Overview

Dictator AI now has comprehensive support for the Model Context Protocol (MCP), allowing AI models to connect to and use tools from external MCP servers. This enables seamless integration with services like weather APIs, database tools, web scrapers, and custom business logic.

## Architecture

### 1. MCP Types (`lib/ai/mcp/types.ts`)

Defines the core types:
- `McpServerConfig`: Configuration for an MCP server (transport type, connection details)
- `McpServerState`: Runtime state of a connected server (connection status, tools)
- `McpToolDefinition`: Tool definition from MCP server
- `McpToolResult`: Result of MCP tool execution

### 2. MCP Client (`lib/ai/mcp/client.ts`)

Handles connection to MCP servers:
- Supports multiple transport types (stdio, SSE, HTTP)
- Manages client lifecycle (connect, disconnect, reconnect)
- Lists available tools from server
- Executes tool calls on the remote server
- Error handling and connection recovery

### 3. MCP Server Manager (`lib/ai/mcp/registry.ts`)

Manages multiple MCP server connections:
- `McpServerManager`: Core manager class
- Registers/unregisters servers
- Discovers and caches server tools
- Routes tool calls to appropriate servers
- Global singleton instance for app-wide access

### 4. MCP Tool Adapter (`lib/ai/mcp/adapter.ts`)

Integrates MCP tools into the existing tool system:
- Converts MCP tool definitions to `RegisteredTool` format
- Handles tool name prefixing (`mcp_<serverId>_<toolName>`)
- Parses MCP tool names for routing
- Registers tools in the central tool registry

### 5. Tool Executor Updates (`lib/ai/tools/executor.ts`)

Updated executor to handle MCP tools:
- Detects MCP tool calls (prefix `mcp_`)
- Routes to MCP server manager
- Executes tools remotely
- Handles errors and permission checks

### 6. Database Schema (`lib/db/schema.ts`)

New `mcpServers` table:
- `id`: Unique server identifier
- `userId`: Owner of the server configuration
- `name`: Human-readable server name
- `enabled`: Enable/disable server
- `transportType`: Connection type (stdio/sse/http)
- `serverCommand`: Command to start server (stdio)
- `serverArgs`: Arguments for server command (JSON)
- `serverUrl`: URL for HTTP/SSE transport
- `createdAt`, `updatedAt`: Timestamps

## Setup & Configuration

### 1. Add MCP Server via API

```bash
curl -X POST http://localhost:3000/api/ai/mcp/servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weather API",
    "transportType": "stdio",
    "serverCommand": "python",
    "serverArgs": ["/path/to/weather_server.py"]
  }'
```

### 2. List Configured Servers

```bash
curl http://localhost:3000/api/ai/mcp/servers
```

### 3. List Available Tools

```bash
curl http://localhost:3000/api/ai/mcp/tools
```

## Usage Examples

### Backend: Register and Use MCP Server

```typescript
import { registerMcpServer, callMcpTool } from '@/lib/ai/mcp/registry';
import { registerMcpServerTools } from '@/lib/ai/mcp/adapter';

const config = {
  id: 'weather-server',
  userId: 'user-123',
  name: 'Weather Service',
  enabled: true,
  transportType: 'stdio' as const,
  serverCommand: 'python',
  serverArgs: ['/path/to/weather_mcp.py'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Register server
await registerMcpServer(config);

// Register tools from server
const toolCount = await registerMcpServerTools('weather-server');
console.log(`Registered ${toolCount} tools`);

// Call a tool
const result = await callMcpTool('weather-server', 'get_weather', {
  location: 'San Francisco',
  unit: 'celsius',
});
```

### Chat with MCP Tools

MCP tools are automatically integrated into the chat system. Once registered, they appear in the tool list and can be called by AI models:

```typescript
import { streamChatWithTools } from '@/lib/ai/tools/chat-integration';
import { AiProvider } from '@/lib/ai/providers/types';

async function* chatWithMcpTools(provider: AiProvider, messages: any[]) {
  for await (const chunk of streamChatWithTools(
    provider,
    { messages, systemPrompt: 'Use available tools to help the user' },
    { context: { userId, documentId, sessionId, requestId } }
  )) {
    if (chunk.type === 'delta') {
      console.log('Text:', chunk.content);
    } else if (chunk.type === 'tool-result') {
      console.log('Tool used:', chunk.result.name);
    }
    yield chunk;
  }
}
```

## Security Model

### Permission System

MCP tools require explicit user approval before execution:
- **Once mode**: Single-use approval
- **Per-document mode**: Valid within a specific document
- **Always mode**: Blanket approval

Same permission flow as HTTP tools:

```typescript
import { toolApiClient, ToolApiError } from '@/lib/ai/tools/api-client';

try {
  const result = await toolApiClient.executeTool(
    {
      id: '1',
      name: 'mcp_weather-server_get_weather',
      arguments: { location: 'NYC' },
    },
    documentId
  );
} catch (error) {
  if (error instanceof ToolApiError && error.code === 'permission_denied') {
    // Request permission
    await toolApiClient.grantPermission(
      error.target!,
      'mcp',
      'per-document',
      documentId
    );
  }
}
```

### Transport Security

- Stdio: Process runs locally, no network exposure
- SSE/HTTP: Only HTTPS connections allowed
- All server configurations stored securely in database
- Per-user server isolation (each user only sees their servers)

## API Endpoints

### Server Management

- **GET /api/ai/mcp/servers** - List user's configured servers
- **POST /api/ai/mcp/servers** - Add new MCP server
- **PUT /api/ai/mcp/servers/:id** - Update server configuration
- **DELETE /api/ai/mcp/servers/:id** - Remove server

### Tool Discovery

- **GET /api/ai/mcp/tools** - List all tools from all connected servers
- **POST /api/ai/mcp/test-connection** - Test server connectivity

### Tool Execution

Uses existing permission system:
- **POST /api/ai/execute-tool** - Execute any tool (HTTP or MCP)
- **GET /api/ai/permissions** - List active permissions
- **POST /api/ai/permissions** - Grant new permission
- **DELETE /api/ai/permissions** - Revoke permission

## Transport Types

### Stdio (Local Process)

For local Python, Node.js, or other executables:

```json
{
  "name": "My Tool",
  "transportType": "stdio",
  "serverCommand": "python",
  "serverArgs": ["/path/to/tool.py", "--debug"]
}
```

### SSE (Server-Sent Events)

For remote servers supporting SSE:

```json
{
  "name": "Remote Tool",
  "transportType": "sse",
  "serverUrl": "https://api.example.com/mcp"
}
```

### HTTP

For HTTP-based MCP servers:

```json
{
  "name": "HTTP Tool",
  "transportType": "http",
  "serverUrl": "https://api.example.com/mcp"
}
```

## Error Handling

### Connection Errors

If a server fails to connect:
- Server state marked as `connected: false`
- Error message stored in `lastError`
- Graceful degradation - other tools still work
- Retry attempts on tool calls

### Tool Execution Errors

MCP tool call failures return:
```typescript
{
  success: false,
  error: "Error message from server"
}
```

### Rate Limiting

MCP tools use same rate limiting as HTTP tools:
- 100 calls per minute per user-tool combination
- Returns 429 when exceeded

## Testing

### Unit Tests

```bash
npm run test -- tests/lib/ai/mcp/
```

Tests cover:
- Server registration and connection
- Tool discovery and caching
- Tool name parsing
- Adapter functionality

### Manual Testing

1. Create test MCP server (example Python):
```python
#!/usr/bin/env python3
import json
import sys

def handle_request(request):
    if request['method'] == 'tools/list':
        return {
            'tools': [
                {
                    'name': 'echo',
                    'description': 'Echo input',
                    'inputSchema': {
                        'type': 'object',
                        'properties': {'text': {'type': 'string'}},
                        'required': ['text']
                    }
                }
            ]
        }
    elif request['method'] == 'tools/call':
        tool = request['params']['name']
        args = request['params']['arguments']
        if tool == 'echo':
            return {'result': args['text']}
    return {'error': 'Unknown request'}

while True:
    line = sys.stdin.readline()
    if not line:
        break
    request = json.loads(line)
    response = handle_request(request)
    print(json.dumps(response))
    sys.stdout.flush()
```

2. Register via API:
```bash
curl -X POST http://localhost:3000/api/ai/mcp/servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Server",
    "transportType": "stdio",
    "serverCommand": "python",
    "serverArgs": ["./test_mcp.py"]
  }'
```

3. Use in chat via AI provider

## Performance Considerations

- **Tool Discovery**: Cached on server registration, refreshed manually
- **Tool Execution**: Synchronous calls to remote server
- **Concurrent Servers**: Multiple servers can run simultaneously
- **Timeout**: Tool calls timeout at 30 seconds (configurable)

## Troubleshooting

### Server Won't Connect

1. Check server command is executable
2. Verify path is correct (use absolute paths)
3. Check server logs for errors
4. Test server directly from command line

### Tools Not Appearing

1. Register server first
2. Check server is connected: `GET /api/ai/mcp/servers`
3. List tools: `GET /api/ai/mcp/tools`
4. Restart server if tools were added

### Permission Errors

1. Grant permission via `/api/ai/permissions` POST
2. Use correct target format (tool name with prefix)
3. Select appropriate mode (once/per-document/always)

### Execution Timeouts

1. Increase timeout if needed (edit executor)
2. Optimize server-side tool implementation
3. Check network latency for remote servers

## Future Enhancements

- [ ] HTTP/SSE transport implementation
- [ ] Tool result caching
- [ ] Async tool execution
- [ ] Server monitoring and health checks
- [ ] Tool schema validation
- [ ] Rate limiting per server
- [ ] UI for server management in settings page
- [ ] Server logs viewer
- [ ] Multi-language server templates

## Production Checklist

- [ ] Database migrations applied (`npm run db:migrate`)
- [ ] All MCP servers tested locally
- [ ] Permission system tested
- [ ] Tool execution works end-to-end
- [ ] Error handling verified
- [ ] Rate limiting tested
- [ ] Audit logs reviewed
- [ ] Security of server commands verified
- [ ] Monitoring/alerting configured
- [ ] Documentation shared with team

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Anthropic Claude Documentation](https://docs.anthropic.com/)
- [Dictator Tool Use System](./TOOL_USE_IMPLEMENTATION.md)
- [Permission System Documentation](./lib/ai/tools/PERMISSIONS_README.md)
