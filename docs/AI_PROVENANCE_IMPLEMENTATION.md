# AI Provenance Data & Metadata UI - MVP Implementation Summary

## Overview
This document summarizes the MVP implementation of AI provenance tracking and display features for the Dictator application across web (TypeScript/Next.js) and mobile (Android/Kotlin) platforms.

## Completed Features

### Phase 1: Data Layer Alignment ✅

**Kotlin Data Types Added** (`dictator-core/data/ai/Types.kt`)
```kotlin
@Serializable
data class AiTurnProvenance(
    val id: String,
    val aiSessionId: String,
    val turnId: String,
    val source: AiContentSource,
    val confidence: Double? = null,
    val contentScope: AiRequestScope? = null,
    val policyId: String? = null,
    val reviewedAt: Long? = null,
    val device: String,
    val userId: String,
    val thinkingContent: String? = null,
    val thinkingBudgetTokens: Int? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Serializable
data class AiTurnWithProvenance(
    val turnId: String,
    val userMessage: String,
    val assistantResponse: String,
    val model: String? = null,
    val provider: ModelProvider? = null,
    val tokenUsage: AiUsage? = null,
    val thinking: String? = null,
    val thinkingBudgetTokens: Int? = null,
    val provenance: AiTurnProvenance,
    val createdAt: Long = System.currentTimeMillis(),
    val acceptedAt: Long? = null
)
```

**Web Types Already Existed** in `lib/privacy/types.ts`:
- `AiContentSource` type: 'human-dictated' | 'human-written' | 'ai-generated' | 'ai-modified'
- `AiRequestScope` type: 'full-document' | 'selected-text' | 'context-snippet'
- `AiTurnProvenance` interface

### Phase 2.1: Web AI History Panel Component ✅

**File:** `components/editor/AiHistoryPanel.tsx`

**Features:**
- Fixed sidebar panel on right side (320px wide)
- Displays AI turns in reverse chronological order
- Color-coded source badges:
  - Green: AI Generated
  - Yellow: AI Modified  
  - Blue: Human Written
  - Purple: Dictated
- Expandable turn cards showing:
  - Truncated preview (80 chars) with full text on expand
  - Source classification with confidence score
  - Device, scope, and timestamp
  - Thinking budget tokens if available
  - Review status
  - Full thinking content in monospace when available
- Loading, error, and empty states
- Proper TypeScript typing with all metadata

**API Integration:**
```typescript
// Fetches from /api/documents/:id/ai-history?limit=50&offset=0
const response = await fetch(`/api/documents/${documentId}/ai-history?limit=50`);
const data = await response.json();
```

### Phase 3.1: Android AI History Screen ✅

**File:** `dictator-android/src/main/kotlin/com/dictator/android/ui/ai/AIHistoryScreen.kt`

**Features:**
- Full-screen Compose UI with TopAppBar
- Same styling consistency with web component
- Collapsible turn cards
- Source color badges matching web
- Metadata display: scope, device, thinking tokens
- Loading, error, and empty states
- Proper timestamp formatting (e.g., "Aug 14, 3:45 PM")
- Thinking content display with monospace font

**API Integration:**
```kotlin
// RemoteApiService method added
suspend fun fetchAiHistory(documentId: String, limit: Int = 50, offset: Int = 0): AiHistoryResponse
```

### Phase 4.2.a: Export Formats System ✅

**File:** `lib/export/ExportFormats.ts`

**Exported Formats:**

1. **JSON Export Format** - Comprehensive with all metadata
   ```json
   {
     "document": { "id", "title", "wordCount", "createdAt", "updatedAt" },
     "content": "...",
     "aiHistory": {
       "totalTurns": 5,
       "turns": [
         {
           "userMessage": "...",
           "assistantResponse": "...",
           "model": "claude-3-opus",
           "provider": "anthropic",
           "provenance": {
             "source": "ai-generated",
             "confidence": 0.95,
             "contentScope": "selected-text",
             "device": "web",
             "createdAt": "2026-08-14T05:25:00.000Z"
           }
         }
       ]
     },
     "auditLog": [...],
     "exportMetadata": {
       "exportedAt": "2026-08-14T05:25:00.000Z",
       "exportFormat": "json-provenance-v1",
       "includesAiHistory": true,
       "includesAuditTrail": true
     }
   }
   ```

2. **Markdown Export Format** - Document with HTML annotations
   - YAML frontmatter with metadata
   - Document content section
   - AI Interaction History with annotations:
     ```markdown
     <!-- AI-TURN-0 source=ai-generated confidence=0.95 device=web timestamp=2026-08-14T05:25:00.000Z -->
     ### Turn 1
     **User Message:** ...
     **AI Response:** ...
     **Metadata:**
     - Source: ai-generated
     - Confidence: 95%
     - Scope: Selected Text
     - Device: web
     ```

3. **CSV Export Format** - Timeline for spreadsheet import
   - Columns: timestamp, type, author, source, confidence, model, text_preview, device, content_scope
   - One row per AI turn
   - Easy import to Excel/Google Sheets

**Export API Endpoint**
```
GET /api/documents/:id/export?format=json|markdown|csv&include=content|history|audit|all
```

## API Endpoints

### Web API Endpoints

**1. Fetch AI History with Provenance**
```
GET /api/documents/:id/ai-history
Query Parameters:
  - limit: number (1-100, default 50)
  - offset: number (default 0)

Response:
{
  "turns": [
    {
      "sessionId": "...",
      "turnIndex": 0,
      "userMessage": "...",
      "assistantResponse": "...",
      "provenance": { ... }
    }
  ],
  "total": 5,
  "limit": 50,
  "offset": 0,
  "documentId": "..."
}
```

**2. Export Document with Provenance**
```
GET /api/documents/:id/export
Query Parameters:
  - format: 'json' | 'markdown' | 'csv' (default: json)
  - include: 'content' | 'history' | 'audit' | 'all' (default: all)

Returns: File download with appropriate MIME type
```

### Android API Integration

**RemoteApiService Methods**
```kotlin
suspend fun fetchAiHistory(
    documentId: String, 
    limit: Int = 50, 
    offset: Int = 0
): AiHistoryResponse
```

**Response Classes** (in `domain/entity/Entities.kt`)
```kotlin
@Serializable
data class AiHistoryTurnResponse(
    val sessionId: String,
    val turnIndex: Int,
    val userMessage: String,
    val assistantResponse: String,
    val provenance: AiTurnProvenanceResponse? = null
)

@Serializable
data class AiTurnProvenanceResponse(
    val source: String,
    val confidence: Double? = null,
    val contentScope: String? = null,
    val device: String,
    val reviewedAt: Long? = null,
    val thinkingContent: String? = null,
    val thinkingBudgetTokens: Int? = null,
    val createdAt: Long
)

@Serializable
data class AiHistoryResponse(
    val turns: List<AiHistoryTurnResponse> = emptyList(),
    val total: Int = 0,
    val limit: Int = 50,
    val offset: Int = 0,
    val documentId: String? = null
)
```

## Design Decisions

### Color Coding System (Both Platforms)
- **Green (#4CAF50)**: AI Generated - Content created entirely by AI
- **Yellow (#FFC107)**: AI Modified - Human content modified by AI
- **Blue (#2196F3)**: Human Written - User-written content
- **Purple (#9C27B0)**: Dictated - Voice-dictated content
- **Gray (#9E9E9E)**: Unknown - No provenance data

### Data Flow
1. User creates AI request → stored in `aiTurns` and `aiTurnProvenance` tables
2. API endpoints fetch from database and aggregate data
3. UI components display with proper formatting and styling
4. Export formats serialize complete data for different use cases

### Pagination Strategy
- Default limit: 50 turns per request
- Maximum limit: 100 turns to prevent large payloads
- Offset-based pagination for simplicity
- Suitable for infinite scroll or "Load More" UI patterns

## File Structure

```
dictator/
├── app/api/documents/
│   ├── [id]/ai-history/route.ts          # NEW: Fetch history with provenance
│   └── [id]/export/route.ts              # NEW: Export in multiple formats
├── components/editor/
│   └── AiHistoryPanel.tsx                # NEW: Sidebar history component
├── lib/export/
│   └── ExportFormats.ts                  # NEW: Export format implementations
└── lib/privacy/
    └── types.ts                          # Existing provenance types

dictator-kotlin/
├── dictator-core/
│   ├── data/ai/Types.kt                  # UPDATED: Add provenance types
│   ├── data/remote/RemoteApiService.kt   # UPDATED: Add fetchAiHistory()
│   └── domain/entity/Entities.kt         # UPDATED: Add response classes
└── dictator-android/ui/ai/
    └── AIHistoryScreen.kt                # NEW: History display screen
```

## Testing Considerations

### Unit Tests Needed
- Export format serialization (JSON, Markdown, CSV)
- Pagination logic with edge cases
- Timestamp formatting across platforms
- Confidence score percentage calculations

### Integration Tests Needed
- API endpoint with actual database data
- Export endpoint response MIME types
- Android API service with mock responses
- Large AI history handling (100+ turns)

### UI Tests Needed
- Sidebar expand/collapse functionality
- Color badge rendering
- Truncation and text overflow
- Empty/loading/error state displays

## Performance Considerations

### Current Optimizations
- Pagination prevents loading entire history at once
- Lazy loading of turn details on expand
- Fixed sidebar prevents layout thrashing
- Efficient Drizzle ORM queries

### Future Optimizations
- Database indexing on `createdAt` for sorting
- Caching of history responses
- Virtual scrolling for very large histories
- Compression of export files

## Known Limitations & Future Enhancements

### Current Limitations
- History sidebar not yet integrated into editor
- No in-document provenance badges/highlights
- Export only supports 3 formats (JSON, Markdown, CSV)
- No settings for provenance display preferences
- Pagination not integrated into UI (needs "Load More" button)

### Future Enhancements (Medium Priority)
- Phase 2.2: Inline content provenance indicators
- Phase 3.2: Detailed AI turn view screen
- Phase 4.2.b-e: PDF, HTML interactive reports
- Phase 5: Settings for indicator display
- Phase 6: Sync optimization with conflict resolution

### Future Enhancements (Lower Priority)
- Export with attached media (images, etc.)
- Batch operations (bulk export, delete history)
- Statistics dashboard (% AI-generated, trends)
- Privacy-first mode (minimal metadata storage)

## Security & Privacy Notes

### Data Handling
- AI history fetches include authorization checks
- User document ownership verified before export
- No sensitive data logged in export metadata
- Thinking content optionally included based on settings

### Compliance
- GDPR: Full data export capability
- CCPA: History included in account deletion
- Audit logging: All history access tracked
- Encryption: Supports encrypted exports (future)

## Integration Checklist for Next Phase

- [ ] Integrate AiHistoryPanel into main editor layout
- [ ] Add toolbar buttons for history and export
- [ ] Wire up export button to download formats
- [ ] Add navigation to AIHistoryScreen in Android
- [ ] Implement "Load More" pagination UI
- [ ] Add settings for provenance display
- [ ] Store user preferences for export format
- [ ] Implement content provenance highlighting
- [ ] Add batch export capability
- [ ] Create statistics dashboard

## Developer Notes

### To Use the Export System
```typescript
import { getExportFormat } from '@/lib/export/ExportFormats';

const exporter = getExportFormat('json');
const content = await exporter.export(documentData);
const filename = exporter.getFilename(documentTitle);
```

### To Display History on Web
```typescript
import { AiHistoryPanel } from '@/components/editor/AiHistoryPanel';

<AiHistoryPanel 
  documentId={documentId} 
  open={showHistory}
  onClose={() => setShowHistory(false)}
/>
```

### To Fetch History on Android
```kotlin
val history = apiService.fetchAiHistory(documentId, limit = 50, offset = 0)
history.turns.forEach { turn ->
    println("Turn ${turn.turnIndex}: ${turn.userMessage}")
    println("Source: ${turn.provenance?.source}")
}
```

## References

- Original plan: `/home/runner/work/dictator/dictator/AI_PROVENANCE_PLAN.md`
- Privacy architecture: `/home/runner/work/dictator/dictator/PRIVACY_ARCHITECTURE.md`
- Database schema: `/home/runner/work/dictator/dictator/lib/db/schema.ts`
- Kotlin privacy types: `/home/runner/work/dictator/dictator/dictator-kotlin/dictator-core/src/commonMain/kotlin/com/dictator/core/data/privacy/PrivacyTypes.kt`
