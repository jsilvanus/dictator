# Remote API Service Split - Multi-Model AI Support Implementation

## Overview

This document describes the implementation of multi-model AI support across the Dictator platform, enabling Claude (Anthropic), OpenAI, Ollama (self-hosted), and generic OpenAI-compatible services.

## Architecture

### Design Patterns

1. **Provider Pattern**: Abstract interface (`AiProvider`) with concrete implementations for each model provider
2. **Factory Pattern**: `AiProviderFactory` creates appropriate provider instances based on configuration
3. **Strategy Pattern**: Switching between providers at runtime based on user preferences
4. **Dependency Injection**: Providers are injected where needed for testability

### Layers

```
┌─────────────────────────────────────────────────────┐
│           User-Facing Applications                   │
│  (Web UI, Android App)                               │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│        API Layer (Web & Android)                     │
│  /api/ai/inline, /api/ai/chat                        │
│  /api/ai/models, /api/ai/preferences                 │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│       Service Layer (AiService)                      │
│  Handles sessions, turns, preferences                │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│    Provider Abstraction & Factory                    │
│  AiProvider (interface)                              │
│  AiProviderFactory (creates instances)               │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│        Concrete Providers                            │
│  ├─ ClaudeProvider (Anthropic)                       │
│  ├─ OpenAiProvider (OpenAI)                          │
│  ├─ OllamaProvider (Self-hosted)                     │
│  └─ GenericOpenAiProvider (Compatible)               │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│        External AI Services                          │
│  ├─ api.anthropic.com                                │
│  ├─ api.openai.com                                   │
│  ├─ localhost:11434 (Ollama)                         │
│  └─ Custom OpenAI-compatible endpoints                │
└──────────────────────────────────────────────────────┘
```

## Environment Configuration

### Required Environment Variables

```bash
# At least ONE of these must be configured:

# Anthropic Claude (Default if available)
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-6          # Optional, defaults to claude-sonnet-4-6

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o                     # Optional, defaults to gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional, for custom OpenAI-compatible services

# Ollama (Self-hosted, no API key needed)
OLLAMA_BASE_URL=http://localhost:11434   # Optional, defaults to localhost:11434
OLLAMA_MODEL=mistral                    # Optional, defaults to mistral

# Generic OpenAI-Compatible
OPENAI_COMPATIBLE_BASE_URL=https://...
OPENAI_COMPATIBLE_API_KEY=sk-...
OPENAI_COMPATIBLE_MODEL=gpt-3.5-turbo   # Optional
```

### Configuration Priority

When no explicit provider is selected:
1. **Claude** (if ANTHROPIC_API_KEY is set)
2. **OpenAI** (if OPENAI_API_KEY is set)
3. **Ollama** (if OLLAMA_BASE_URL is set, or in development mode)
4. **Generic OpenAI-Compatible** (if both OPENAI_COMPATIBLE_BASE_URL and OPENAI_COMPATIBLE_API_KEY are set)
5. **Fallback** to Ollama with localhost:11434

## Database Schema

### User AI Preferences Table

```sql
CREATE TABLE "user_ai_preferences" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL UNIQUE,
  "preferred_provider" ai_provider NOT NULL DEFAULT 'claude',
  "preferred_model" text,
  "custom_temperature" numeric(3, 2),
  "custom_max_tokens" integer,
  "ollama_url" text,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
)
```

**Fields**:
- `preferred_provider`: One of 'claude', 'openai', 'ollama', 'openai-compatible'
- `preferred_model`: Optional override for default model
- `custom_temperature`: Optional temperature override (0.0-2.0)
- `custom_max_tokens`: Optional max tokens override
- `ollama_url`: Custom Ollama endpoint (if using self-hosted)

## API Endpoints

### 1. Inline AI Request
**POST /api/ai/inline**

```typescript
// Request
{
  "prompt": "string",
  "snapshot": { /* InlineEditorSnapshot */ },
  "session": { /* AiSession */ }
}

// Response
{
  "action": { /* AiAction */ },
  "explanation": "string",
  "speech": "string"
}
```

**Features**:
- Uses user's preferred provider
- Falls back to default provider if not configured
- Respects user's temperature and maxTokens settings

### 2. Chat with Streaming
**POST /api/ai/chat**

```typescript
// Request
{
  "message": "string",
  "snapshot": { /* InlineEditorSnapshot */ },
  "documentId": "uuid",
  "history": [{ role: "user"|"assistant", content: "string" }]
}

// Response (streaming)
// Server-Sent Events with text chunks
data: chunk1
data: chunk2
...
```

**Features**:
- Streaming responses from all providers
- Unified response format across providers
- Automatic session persistence

### 3. Get Available Models
**GET /api/ai/models**

```typescript
// Response
{
  "providers": [
    { type: "claude", name: "Claude (Anthropic)", configured: true },
    { type: "openai", name: "OpenAI", configured: true },
    ...
  ],
  "all": [
    // All supported providers, including unconfigured ones
  ]
}
```

### 4. User Preferences Management
**GET /api/ai/preferences**

```typescript
// Response
{
  "preferredProvider": "claude",
  "preferredModel": "claude-sonnet-4-6",
  "customTemperature": 0.7,
  "customMaxTokens": 2048,
  "ollamaUrl": null
}
```

**POST /api/ai/preferences**

```typescript
// Request
{
  "preferredProvider": "openai",
  "preferredModel": "gpt-4o",
  "customTemperature": 0.5,
  "customMaxTokens": 1024,
  "ollamaUrl": null
}

// Response
{
  "success": true,
  "message": "Preferences updated",
  "preferences": { /* updated preferences */ }
}
```

## Provider Implementation Details

### Claude Provider

**Endpoint**: `https://api.anthropic.com/v1/messages`

**Features**:
- Native streaming support via SSE
- Structured JSON responses
- Token usage reporting
- Temperature: 0.0-2.0 (optimized for 0.2 for inline tasks)
- Max tokens: configurable (default 800 for inline, 2048 for chat)

**Environment**:
- `ANTHROPIC_API_KEY`: Required
- `CLAUDE_MODEL`: Optional, defaults to `claude-sonnet-4-6`

### OpenAI Provider

**Endpoint**: `https://api.openai.com/v1/chat/completions`

**Features**:
- SSE streaming support
- Chat completion format
- Token usage reporting
- Temperature: 0.0-2.0
- Max tokens: configurable (default 2048)

**Environment**:
- `OPENAI_API_KEY`: Required
- `OPENAI_MODEL`: Optional, defaults to `gpt-4o`
- `OPENAI_BASE_URL`: Optional for proxy/custom endpoints

### Ollama Provider

**Endpoint**: `http://localhost:11434/api/chat` or `http://localhost:11434/api/generate`

**Features**:
- Local deployment (no API key)
- JSON Lines streaming format
- No token usage reporting
- Temperature: 0.0-2.0
- Max tokens: configurable (via `num_predict`)

**Environment**:
- `OLLAMA_BASE_URL`: Optional, defaults to `http://localhost:11434`
- `OLLAMA_MODEL`: Optional, defaults to `mistral`

**Setup**:
```bash
# Install Ollama from https://ollama.ai
ollama run mistral
# Or other models: ollama run llama2, ollama run neural-chat, etc.
```

### Generic OpenAI-Compatible Provider

**Endpoint**: `{OPENAI_COMPATIBLE_BASE_URL}/chat/completions`

**Features**:
- Supports any OpenAI-compatible API
- SSE streaming support
- Dynamic endpoint configuration
- Temperature and token configuration

**Environment**:
- `OPENAI_COMPATIBLE_BASE_URL`: Required
- `OPENAI_COMPATIBLE_API_KEY`: Required
- `OPENAI_COMPATIBLE_MODEL`: Optional

**Examples**:
- Azure OpenAI: Set base URL to your Azure endpoint
- Local LLM servers with OpenAI-compatible APIs
- Third-party OpenAI proxies

## Implementation on Web (Next.js)

### File Structure
```
lib/ai/providers/
├── types.ts                 # TypeScript types for all providers
├── base.ts                  # BaseAiProvider abstract class
├── claude.ts                # ClaudeProvider implementation
├── openai.ts                # OpenAiProvider implementation
├── ollama.ts                # OllamaProvider implementation
├── generic-openai.ts        # GenericOpenAiProvider implementation
└── factory.ts               # AiProviderFactory

app/api/ai/
├── inline/route.ts          # Updated to use providers
├── chat/route.ts            # Updated to use providers
├── models/route.ts          # List available models
└── preferences/route.ts      # Get/set user preferences
```

### Usage Example

```typescript
import { AiProviderFactory } from '@/lib/ai/providers/factory';

// Create provider from environment
const provider = AiProviderFactory.createFromEnv();

// Or create specific provider
const provider = AiProviderFactory.createByType('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o'
});

// Use provider
const response = await provider.askInline({
  prompt: 'Hello!',
  context: 'System prompt',
  temperature: 0.7,
  maxTokens: 1000
});

// Or stream
const stream = await provider.chat({
  messages: [{ role: 'user', content: 'Hello!' }],
  systemPrompt: 'You are helpful',
  stream: true
});

for await (const chunk of stream) {
  if (chunk.type === 'delta') {
    console.log(chunk.content);
  } else if (chunk.type === 'error') {
    console.error(chunk.error);
  }
}
```

## Implementation on Android (Kotlin)

### File Structure
```
dictator-kotlin/dictator-core/src/commonMain/kotlin/com/dictator/core/data/ai/
├── Types.kt                 # Kotlin types
├── AiProvider.kt            # Interface
├── BaseAiProvider.kt        # Base implementation
├── ClaudeProvider.kt        # Claude
├── OpenAiProvider.kt        # OpenAI
├── OllamaProvider.kt        # Ollama
├── GenericOpenAiProvider.kt # Generic OpenAI-compatible
└── AiProviderFactory.kt     # Factory pattern
```

### Usage Example

```kotlin
import com.dictator.core.data.ai.*
import kotlinx.coroutines.flow.collect

val httpClient = // HttpClient instance
val provider = AiProviderFactory.createFromEnv(httpClient)

// Inline request
val response = provider.askInline(
  AiInlineRequest(
    prompt = "Hello!",
    context = "System prompt",
    temperature = 0.7,
    maxTokens = 1000
  )
)
println(response.content)

// Streaming chat
provider.chat(
  AiChatRequest(
    messages = listOf(AiChatMessage("user", "Hello!")),
    systemPrompt = "You are helpful",
    stream = true
  )
).collect { chunk ->
  when (chunk) {
    is AiStreamChunk.Delta -> println(chunk.content)
    is AiStreamChunk.Error -> System.err.println(chunk.error)
    is AiStreamChunk.Complete -> println("Done")
  }
}
```

## Backwards Compatibility

### Web API
- All existing endpoints (`/api/ai/inline`, `/api/ai/chat`) continue to work as before
- Claude is used by default if `ANTHROPIC_API_KEY` is set
- New endpoints (`/api/ai/models`, `/api/ai/preferences`) are additive

### Android
- Existing `RemoteApiService` continues to work unchanged
- Delegates to web API for provider selection
- User preferences are fetched from server

## Migration Path

### For Existing Deployments

1. **No changes required** for Claude-only deployments
2. **To add OpenAI**:
   - Set `OPENAI_API_KEY` environment variable
   - Users can switch via preferences API
   
3. **To add Ollama**:
   - Set `OLLAMA_BASE_URL` environment variable
   - Start Ollama: `ollama run mistral`
   - Users can switch via preferences API

### For New Deployments

1. **Configure at least one provider** via environment variables
2. **Run database migration** for `user_ai_preferences` table
3. **Users can select preferred provider** via settings

## Testing

### Manual Testing Checklist

```bash
# 1. Test Claude Provider
curl -X POST http://localhost:3000/api/ai/inline \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello",
    "snapshot": {},
    "session": {}
  }'

# 2. Test OpenAI Provider
OPENAI_API_KEY=sk-... npm run dev

# 3. Test Ollama Provider
ollama run mistral
OLLAMA_BASE_URL=http://localhost:11434 npm run dev

# 4. Test Preferences
curl http://localhost:3000/api/ai/preferences
curl -X POST http://localhost:3000/api/ai/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "preferredProvider": "openai",
    "preferredModel": "gpt-4o"
  }'

# 5. Test Available Models
curl http://localhost:3000/api/ai/models
```

### Unit Tests

- Test factory creation for all provider types
- Test provider configuration validation
- Test fallback logic when provider not configured
- Test user preference retrieval and update
- Mock streaming responses for each provider

## Performance Considerations

### Streaming Efficiency
- All providers support streaming for real-time response
- Stream chunks are forwarded immediately to client
- Memory usage is constant regardless of response size

### Caching
- No caching layer implemented (delegated to external services)
- Implement Redis caching if needed for frequently asked questions

### Rate Limiting
- Existing `aiRateLimiter` applies across all providers
- Per-provider rate limits can be added if needed

## Troubleshooting

### "No AI provider configured" Error
- Set at least one provider environment variable
- Check environment variable names (case-sensitive)
- Verify API keys are valid

### Provider-Specific Errors

**Claude**:
- `401 Unauthorized`: Check `ANTHROPIC_API_KEY`
- `API version not supported`: Update `anthropic-version` header

**OpenAI**:
- `401 Unauthorized`: Check `OPENAI_API_KEY`
- `Model not found`: Verify `OPENAI_MODEL` is available to your account

**Ollama**:
- `Connection refused`: Ensure Ollama is running (`ollama serve`)
- `Model not found`: Pull model first (`ollama pull mistral`)

**Generic OpenAI-Compatible**:
- `Connection refused`: Check `OPENAI_COMPATIBLE_BASE_URL`
- `401 Unauthorized`: Verify `OPENAI_COMPATIBLE_API_KEY`

## Future Enhancements

1. **Per-provider rate limiting**: Implement limits per provider
2. **Cost tracking**: Track API costs by provider and user
3. **Provider health monitoring**: Monitor provider availability
4. **Fallback chains**: Automatically try alternate providers if one fails
5. **Batch processing**: Support batch requests for cost optimization
6. **Fine-tuned models**: Allow per-user fine-tuned model selection
7. **Custom system prompts**: Per-provider system prompt templates
8. **Token counting**: Pre-count tokens before sending requests

## References

- [Anthropic Claude API](https://docs.anthropic.com/en/api/getting-started)
- [OpenAI API](https://platform.openai.com/docs/api-reference)
- [Ollama](https://ollama.ai)
- [TypeScript Provider Pattern](https://refactoring.guru/design-patterns/strategy)
