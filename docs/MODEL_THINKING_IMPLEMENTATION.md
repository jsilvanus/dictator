# Model Thinking (Extended Thinking) Support - Implementation Summary

## Overview
This document describes the implementation of Claude's extended thinking (model thinking) feature in Dictator, available in both web and Android platforms.

## What is Model Thinking?
Model thinking is Claude's extended thinking capability that allows the model to spend more computation time reasoning through problems before providing a response. This results in:
- Better quality responses for complex tasks
- Visible reasoning process (thinking blocks)
- Configurable thinking budget (1024-10000 tokens)

## Implementation Details

### Core Type Definitions

#### TypeScript/Web (`lib/ai/providers/types.ts`)
```typescript
// Request types now include thinking budget
type AiInlineRequest = {
  thinkingBudgetTokens?: number;  // New field
  // ... other fields
};

type AiChatRequest = {
  thinkingBudgetTokens?: number;  // New field
  // ... other fields
};

// Response types now include thinking content
type AiResponse = {
  thinking?: string;  // Model's thinking process
  // ... other fields
};

// Stream chunks now include thinking deltas
type AiStreamChunk = {
  type: 'thinking-delta' | 'thinking-complete' | 'delta' | 'complete' | ...;
  // ... other fields
};
```

#### Kotlin/Android (`dictator-kotlin/dictator-core/.../Types.kt`)
Same pattern as TypeScript with equivalent Kotlin data classes.

### Claude Provider Implementation

#### Web (`lib/ai/providers/claude.ts`)
1. **askInline method**: 
   - Checks for `thinkingBudgetTokens` in request
   - Adds `thinking` parameter to Anthropic API request
   - Extracts thinking blocks from response
   - Returns both thinking content and main response

2. **chat method**:
   - Passes `thinkingBudgetTokens` to API
   - Returns thinking parameter in request body

3. **createStreamFromResponse method**:
   - Handles `content_block_start` events for thinking blocks
   - Processes `thinking_delta` events and emits `thinking-delta` chunks
   - Accumulates thinking content separately from text

#### Android (`dictator-kotlin/.../ClaudeProvider.kt`)
- Same implementation pattern as TypeScript
- Uses Kotlin serialization for API requests
- Streams thinking blocks through Flow<AiStreamChunk>

### Database Schema

#### Migrations
1. **`0010_add_model_thinking_support.sql`**: Adds thinking columns to `ai_turn_provenance`
   - `thinking_content` (text): Stores the model's thinking blocks
   - `thinking_budget_tokens` (integer): Budget allocated for this turn

2. **`0011_add_thinking_budget_to_preferences.sql`**: Adds thinking to `user_ai_preferences`
   - `thinking_budget_tokens` (integer): User's preferred thinking budget (1024-10000)

#### Schema Tables Updated
- `ai_turn_provenance`: Now tracks thinking content and budget per turn
- `user_ai_preferences`: Now stores user's thinking preference

### User Preferences & Configuration

#### API Endpoint: `/api/ai/preferences` (Updated)
- **GET**: Returns current preferences including `thinkingBudgetTokens`
- **POST**: Updates preferences with validation
  - Accepts `thinkingBudgetTokens` (1024-10000 range)
  - Validates range and rejects invalid values
  - Returns updated preferences in response

### API Routes Updated

#### `/api/ai/chat` (Updated)
- Passes `thinkingBudgetTokens` from user preferences to provider
- Supports thinking blocks in streaming responses
- Processes and forwards thinking deltas to client

#### `/api/ai/inline` (Updated)
- Passes `thinkingBudgetTokens` from user preferences to askInline
- Supports thinking content in inline responses

### AI Session & Turn Tracking

#### AiTurn Type (`lib/ai/session.ts`)
```typescript
type AiTurn = {
  thinking?: string;              // Model's thinking for this turn
  thinkingBudgetTokens?: number;  // Budget allocated
  // ... other fields
};
```

### Key Features

1. **Configurable Budget**: Users can set thinking budget from 1024-10000 tokens
2. **Streaming Support**: Thinking blocks stream in real-time during responses
3. **Separate Tracks**: Thinking content separated from main response
4. **Privacy Aware**: Thinking content tracked with same privacy rules as other AI content
5. **Database Persistence**: Thinking blocks stored for audit and replay
6. **Cross-Platform**: Full support in both web and Android

## API Request Format

When thinking is enabled, the Claude API request includes:
```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 2048,
  "thinking": {
    "type": "enabled",
    "budget_tokens": 5000
  },
  "messages": [...],
  "stream": true
}
```

## API Response Format

Responses include thinking blocks:
```json
{
  "content": [
    {
      "type": "thinking",
      "thinking": "Let me think through this problem..."
    },
    {
      "type": "text",
      "text": "Based on my analysis..."
    }
  ]
}
```

## Streaming Events

During streaming:
1. `content_block_start` with type "thinking" signals start of thinking
2. `content_block_delta` with `thinking_delta` type sends thinking text
3. `content_block_start` with type "text" signals end of thinking
4. `content_block_delta` with `text_delta` type sends response text

Our implementation:
- Emits `thinking-delta` chunks while thinking streams
- Emits `delta` chunks for response text
- Accumulates all content for final storage

## User Experience

### Web UI
- Settings page allows configuring thinking budget (slider 1024-10000)
- Chat interface displays thinking indicator during streaming
- Thinking content can be toggled/collapsed in responses
- Inline AI requests support thinking automatically

### Android UI
- Settings screen for thinking budget configuration
- Chat and inline responses show thinking status
- Thinking content displayed separately from main response

## Compatibility

- **Models**: Requires Claude 3.7 Sonnet or later
- **API Version**: Uses Anthropic API version 2023-06-01+
- **Cost Impact**: Thinking tokens are billed at same rate as output tokens

## Validation

- Thinking budget: 1024-10000 tokens (validated at API endpoint)
- Feature only enabled when budget is set (optional field)
- Graceful fallback if model doesn't support thinking

## Database Versioning

The implementation maintains backward compatibility:
- Thinking columns are nullable
- Existing records work without thinking data
- Migrations add columns without data loss

## Future Enhancements

Potential improvements:
1. UI visualization of thinking process
2. Metrics on thinking effectiveness
3. Different budgets for different task types
4. Analytics on thinking usage patterns
5. Selective thinking (enable for complex questions only)

## Testing Recommendations

1. Test with various thinking budgets (1024, 5000, 10000)
2. Verify streaming completeness with thinking enabled
3. Test fallback when thinking not supported
4. Verify database persistence of thinking content
5. Test privacy compliance with thinking content
6. Test Android implementation with same scenarios

## References

- Claude API documentation: https://docs.anthropic.com/
- Extended thinking feature: Anthropic's latest API enhancements
- Stream format: Anthropic SSE specification
