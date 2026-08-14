# AI Tool Use and MCP Support - Complete Implementation Guide

## Overview

The Dictator AI application now has comprehensive support for tool use and function calling. AI models can now execute external actions like HTTP requests, text editing, and document queries through a secure permission-based system.

## Architecture

### 1. Type System (lib/ai/providers/types.ts)

Extended types for tool support:
- `AiTool`: Tool definition with name, description, and JSON schema
- `ToolCall`: Invocation from AI with ID, name, and arguments
- `ToolResult`: Result of tool execution with success/error fields
- `ToolPermission`: Permission grant with user, target, mode, and scope

### 2. Tool Infrastructure (lib/ai/tools/)

**Registry** (`registry.ts`):
- Central registry of all available tools
- Thread-safe registration and retrieval
- Supports tool filtering by permission requirements

**Executor** (`executor.ts`):
- Safe execution environment for tools
- Rate limiting: 100 calls per minute per user/tool
- Comprehensive error handling
- Audit logging (capped at 10,000 entries)
- Permission checking before execution

**Permissions** (`permissions.ts`):
- Three approval modes:
  - `once`: Global one-time approval
  - `per-document`: Document-scoped permission
  - `always`: Blanket approval
- Wildcard domain matching (e.g., `*.api.example.com`)
- Automatic expiration handling

**Storage** (`permissions-store.ts`):
- Database abstraction for permissions
- PostgreSQL implementation (default)
- MongoDB compatibility
- In-memory store for testing

### 3. Built-in Tools

**HTTP Tools** (`http-tools.ts`):
- `http_get`: Fetch data from URLs
  - 30-second timeout
  - 1MB response size limit
  - HTTPS required, no private IPs
  - Rate limiting
- `http_post`: Send POST requests
  - Same safety features as GET
  - JSON and form-encoded body support

**Text Tools** (`text-tools.ts`):
- `text_edit`: Replace text at position
- `text_insert`: Insert text at position
- `text_delete`: Delete text at range
- In-memory document store for execution context

**Document Tools** (`document-tools.ts`):
- `search_document`: Full-text search within document
- `get_document_section`: Retrieve text by offset/length
- `get_paragraph`: Get specific paragraph by index

### 4. Provider Updates

All 5 AI providers updated to support tool use:

**Claude** (`claude.ts`):
- Parses Anthropic's `tool_use` content blocks
- Returns structured tool calls with arguments

**OpenAI** (`openai.ts`):
- Parses OpenAI's `function_calls` format
- Handles streaming tool call updates

**Generic OpenAI** (`generic-openai.ts`):
- OpenAI-compatible API support
- Same tool parsing as OpenAI

**Ollama** (`ollama.ts`):
- Basic tool schema support
- Tools transmitted in request if available

**Dictator** (`dictator.ts`):
- Custom tool schema integration
- Both inline and chat modes

### 5. Chat Integration (lib/ai/tools/chat-integration.ts)

**executeChatWithTools()**:
- Multi-turn tool execution loop
- Injects tool results back into conversation
- Configurable max tool calls and loops
- Proper error handling

**streamChatWithTools()**:
- Async generator for streaming
- Yields chunks as they arrive
- Includes tool result notifications
- Real-time feedback

### 6. API Endpoints

**GET /api/ai/tools**:
- Returns list of available tools with schemas
- Authentication required
- Paginated response

**POST /api/ai/execute-tool**:
- Execute a specific tool
- Permission checking
- Rate limiting
- Returns ToolResult with success/error
- 403 for permission denied (includes target for UI)

**GET /api/ai/permissions**:
- List all active permissions for user
- Filters out expired permissions
- Returns permission metadata

**POST /api/ai/permissions**:
- Grant new permission
- Validates request format
- Updates existing permission if already granted
- Requires documentId for per-document/once modes

**DELETE /api/ai/permissions**:
- Revoke permission for target
- Removes all permissions for that target
- User scoped

### 7. Client Library (lib/ai/tools/api-client.ts)

**ToolApiClient**:
- `getAvailableTools()`: Fetch list of tools
- `executeTool()`: Execute tool with permission handling
- `listPermissions()`: Get user's permissions
- `grantPermission()`: Request approval
- `revokePermission()`: Revoke approval

**ToolApiError**:
- Extended error class
- Includes error code, status, target
- Special handling for permission_denied

### 8. Database Schema (lib/db/schema.ts)

**toolPermissions table**:
- `userId` (FK to users)
- `target`: URL or MCP name
- `toolType`: 'http' | 'mcp'
- `mode`: 'once' | 'per-document' | 'always'
- `documentId`: Optional (FK to documents)
- `createdAt`, `expiresAt`: Timestamps
- Unique constraint: (userId, target, toolType, documentId)

## Security Model

### Permission Checks

1. **Before Tool Execution**:
   - Executor checks `PermissionManager.checkPermission()`
   - Extracts target from tool arguments
   - Validates permission mode and scope
   - Checks expiration

2. **URL Validation**:
   - HTTPS only (no http://)
   - No private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
   - No localhost/127.0.0.1
   - Wildcard pattern support

3. **Rate Limiting**:
   - 100 calls per minute per user/tool combination
   - Per-tool counters reset after 1 minute
   - Returns 429 if exceeded

4. **Audit Logging**:
   - All tool calls logged with timestamp, user, arguments, result
   - Capped at 10,000 entries to prevent memory issues
   - Includes error details for debugging

### Approval Modes

**Once Mode**:
- Single use globally
- After execution, permission is expired
- User granted access once to perform action

**Per-Document Mode**:
- Permission scoped to specific document
- Can be used multiple times within that document
- Different documents need separate approvals

**Always Mode**:
- Blanket approval for target
- No expiration
- Suitable for trusted, frequently-used endpoints

## Usage Examples

### Backend: Execute Tool

```typescript
import { ToolExecutor } from '@/lib/ai/tools/executor';
import { ToolCall } from '@/lib/ai/providers/types';

const executor = new ToolExecutor();

const result = await executor.execute(
  {
    id: '1',
    name: 'http_get',
    arguments: { url: 'https://api.example.com/data' }
  },
  {
    userId: 'user-123',
    documentId: 'doc-456',
    sessionId: 'session-789',
    requestId: 'req-001'
  }
);

if (result.success) {
  console.log('Result:', result.result);
} else {
  console.error('Error:', result.error);
}
```

### Frontend: Request Permission

```typescript
import { toolApiClient, ToolApiError } from '@/lib/ai/tools/api-client';

try {
  const result = await toolApiClient.executeTool(
    {
      id: '1',
      name: 'http_get',
      arguments: { url: 'https://api.example.com/data' }
    },
    documentId
  );
  
  if (result.success) {
    // Use result
  }
} catch (error) {
  if (error instanceof ToolApiError && error.code === 'permission_denied') {
    // Prompt user to approve
    await toolApiClient.grantPermission(
      error.target!,
      'http',
      'per-document',
      documentId
    );
    // Retry
  }
}
```

### Chat with Tools

```typescript
import { streamChatWithTools } from '@/lib/ai/tools/chat-integration';
import { AiProvider } from '@/lib/ai/providers/types';

async function* chatWithTools(
  provider: AiProvider,
  messages: any[]
) {
  for await (const chunk of streamChatWithTools(
    provider,
    { messages, systemPrompt: 'Help user...' },
    {
      context: {
        userId: 'user-123',
        documentId: 'doc-456',
        sessionId: 'session-789',
        requestId: 'req-001'
      }
    }
  )) {
    if (chunk.type === 'delta') {
      console.log('Text:', chunk.content);
    } else if (chunk.type === 'tool-result') {
      console.log('Tool:', chunk.result.name, 'Result:', chunk.result);
    }
    yield chunk;
  }
}
```

## Configuration

### Environment Variables

```env
# For tool-enabled features, ensure these are set:
ANTHROPIC_API_KEY=sk-ant-...  # For Claude provider
OPENAI_API_KEY=sk-...          # For OpenAI provider
OLLAMA_BASE_URL=http://...     # For Ollama provider

# Database credentials (for permission storage)
DATABASE_URL=******localhost/dictator
```

### Database Migration

Tool permissions table is defined in schema. Run migrations:

```bash
npm run db:generate  # Generate migration from schema
npm run db:migrate   # Apply migrations
```

## Testing

### In-Memory Storage

For development/testing without database:

```typescript
import { InMemoryToolPermissionStore } from '@/lib/ai/tools/permissions-store';

const store = new InMemoryToolPermissionStore();
const permissionManager = new PermissionManager(store);
```

### Mock Tools

For testing chat without external HTTP calls:

```typescript
import { setTestDocument } from '@/lib/ai/tools/text-tools';

// Set up test document content
setTestDocument('doc-123', 'Document content here...');

// Tools will use test content instead of making HTTP calls
```

## Future Enhancements (Phase 4-5)

### MCP Protocol Support
- Full Model Context Protocol client implementation
- MCP server registration and discovery
- External tool provider integration

### UI Features
- Tool call visualization in chat
- Permission approval UI
- Settings page for permission management
- Audit log viewer
- Document edit history with AI attribution

## Debugging

### Enable Audit Logging

Audit logs are automatically collected. Access via:

```typescript
import { getGlobalExecutor } from '@/lib/ai/tools/executor';

const executor = getGlobalExecutor();
const logs = executor.getAuditLogs(); // Returns last 10,000 entries
```

### Rate Limit Status

```typescript
const executor = getGlobalExecutor();
const status = executor.getRateLimitStatus('user-123');
console.log(`Remaining calls: ${status.remaining}`);
```

### Permission Debugging

```typescript
import { getPermissionManager } from '@/lib/ai/tools/permissions';

const pm = getPermissionManager();
const hasPermission = pm.checkPermission(userId, target, documentId);
console.log('Permission:', hasPermission);
```

## Troubleshooting

### Tool Not Found

- Check tool is registered in `registry.ts`
- Ensure initialization: `await initializeTools()`
- Verify tool name matches exactly

### Permission Denied

- Grant permission via `/api/ai/permissions` POST
- Check permission mode matches usage context
- Verify target URL matches exactly (wildcards for domains)

### Rate Limit Exceeded

- Wait 60 seconds for rate limit to reset
- Consider reducing tool call frequency
- Check logs for excessive tool usage

## Performance Notes

- Tools execute sequentially within a chat turn
- Max 10 tool calls per request (configurable)
- Max 3 tool loops to prevent infinite recursion
- HTTP timeouts at 30 seconds
- Audit logs capped at 10k entries (auto-cleanup oldest)

## Production Checklist

- [ ] Database schema migrated
- [ ] Environment variables configured
- [ ] Permission storage set up (PostgreSQL or MongoDB)
- [ ] HTTPS enforced for all HTTP tools
- [ ] Rate limiter configured
- [ ] Audit logging enabled
- [ ] Error handling tested
- [ ] Permission flows tested
- [ ] UI for permission approval ready
- [ ] Monitoring/alerting for tool failures set up
