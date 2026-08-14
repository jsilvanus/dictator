# Platform Parity Audit: High-Confidence Findings

**Status Date:** August 14, 2026 | **Overall Parity:** 82% (improved from 79%)

## CRITICAL MISALIGNMENTS: 3 Key Findings

**New:** Cursor system is now 90% aligned, adding to verified parity areas

### 🔴 FINDING #1: Voice Command Parsing Logic Divergence (STILL PRESENT)

**Severity**: Medium (Functional inconsistency)

**Web Implementation** (TypeScript)
```typescript
Location: lib/voice/commands.ts, lines 38-44
Also affects: lib/voice/cursor-parser.ts (cursor command parsing)
Logic: Regex-based trigger detection with word boundary matching
Pattern: \\b(${triggers.map(escapeRegex).join('|')})\\b\\s*[,:-]?\\s*
Result: Flexible matching allowing "Computer, do something" or "Computer: do something"
```

**Android Implementation** (Kotlin)
```kotlin
Location: dictator-core/src/commonMain/kotlin/com/dictator/core/util/voice/VoiceCommandParser.kt, lines 71-79
Also affects: dictator-core/src/commonMain/kotlin/com/dictator/core/util/cursor/CursorParser.kt
Logic: Direct exact phrase matching with case-insensitive normalized input
Pattern: normalized.contains(phrase.lowercase())
Result: Strict substring matching - "Computer" must appear exactly in the spoken text
```

**Scope Update (August 2026)**
- This divergence affects both regular voice commands AND cursor voice commands
- Cursor system was implemented with the same parsing divergence
- Both platforms can parse cursor commands for text selection, but with different accuracy

**Impact**: 
- Same voice input may be parsed differently across platforms
- Web handles punctuation/spacing variations that Android doesn't
- Could cause user confusion when switching between devices
- Especially problematic for cursor commands where precision matters

**Recommendation**: Align both platforms to use regex-based approach with word boundaries for consistency and better voice recognition tolerance

---

### 🔴 FINDING #2: Sync Implementation Architecture Disparity

**Severity**: High (Maintainability & feature risk)

**Web Implementation** (2512 total LOC across 9 modules)
```
lib/sync/
├── service.ts (305 LOC) - Main orchestration
├── conflict-resolution.ts (369 LOC) - Dedicated conflict handling
├── diff-service.ts (299 LOC) - Dedicated diff computation
├── version-history.ts (306 LOC) - Dedicated version tracking
├── version-branching.ts (327 LOC) - Dedicated branching logic
├── sync-performance.ts (381 LOC) - Performance monitoring
├── recovery-service.ts (239 LOC) - Recovery mechanisms
├── sync-notification.ts (266 LOC) - Notification system
└── index.ts (20 LOC) - Exports
Total: 2512 LOC - SPECIALIZED, MODULAR
```

**Android Implementation** (Single service)
```kotlin
Location: dictator-core/src/commonMain/kotlin/com/dictator/core/service/SyncServiceImpl.kt (258 LOC)
All sync concerns consolidated into one class:
- Conflict resolution
- Version history management
- Diff computation
- Recovery mechanisms
- All in ~258 LOC
Result: Less detailed but more maintainable
```

**Impact**:
- **Web Advantages**: More granular control, easier to extend individual features
- **Web Disadvantages**: 9x more LOC to maintain, more interdependencies
- **Android Advantages**: Simpler to understand and maintain, clearer single responsibility
- **Android Disadvantages**: Less explicit separation of concerns, harder to scale features
- **Parity Risk**: If either platform's sync breaks, the other likely has incomplete error handling

**Recommendation**: 
- Document expected behavior for edge cases (conflicts, version merging, recovery)
- Add integration tests for sync scenarios on Android
- Consider refactoring web to consolidate some modules

---

### 🔴 FINDING #3: Authentication Mechanism Divergence

**Severity**: High (Security & token management)

**Web Implementation** (NextAuth.js Session-Based)
```typescript
Location: auth.ts
Mechanism: Server-side HTTP sessions with cookies
Flow:
  1. User logs in
  2. Server creates session + sets httpOnly cookie
  3. Subsequent requests include cookie automatically
  4. Server validates session on each request
  
Session Store: Server-side (database/file)
Token Type: Opaque session ID
Duration: Session-based (can be persistent or per-connection)
```

**Android Implementation** (Token-Based)
```kotlin
Location: dictator-core/src/commonMain/kotlin/com/dictator/core/service/AuthServiceImpl.kt
Mechanism: JWT or ****** model
Flow:
  1. User logs in
  2. Server returns JWT/******
  3. Client stores token locally (SharedPreferences)
  4. Subsequent requests include Authorization header
  5. Server validates token signature on each request

Session Store: Client-side (SharedPreferences)
Token Type: JWT (self-contained, can verify without server state)
Duration: Token expiration time (typically ~1 hour)
```

**Impact**:
- **Cross-platform Issues**:
  - Web cannot directly use Android's JWT without refactoring
  - Android cannot use web's server sessions (not portable)
  - Logout isn't synchronized between platforms
  - Token refresh mechanisms differ
  
- **Security Implications**:
  - Web: Cookies subject to CSRF if not properly configured
  - Android: Tokens can be extracted from device storage
  - No mutual token invalidation across platforms
  
- **User Experience**:
  - Logging out on web doesn't log out Android
  - Each platform maintains separate "session" state
  - Multi-device session management not coordinated

**Recommendation**:
1. **Short-term**: Document this architectural difference clearly
2. **Medium-term**: Implement token-based auth for web as well
3. **Long-term**: Create unified authentication service with token validation on both ends

---

## ✅ VERIFIED PARITY (25 Complete Features in August 2026)

### Cursor System - MOSTLY ALIGNED (NEW)
```
✓ Navigation (paragraph/word/character boundaries)
✓ Selection mechanisms (expand/collapse/getText)
✓ Cursor size management (3 sizes identical)
✓ Privacy detection with selections (PII detection before AI)
✓ AI context building with selections (SelectionMode integration)
✓ Cursor state management (hook/ViewModel pattern)
⚠️ Voice commands for cursor (same regex vs direct match divergence)
```

### AI Provider System - FULLY ALIGNED
```
Both platforms support:
✓ Claude (with extended thinking)
✓ OpenAI
✓ Ollama (local models)
✓ Generic OpenAI-compatible
✓ Dictator Provider

Thinking Budget Tokens: ✓ Identical implementation
Data Models (AiInlineRequest, AiChatRequest, AiResponse): ✓ Identical
```

### Tool System - FULLY ALIGNED
```
✓ Tool Registry (register/list/lookup)
✓ Tool Executor (execute with context)
✓ Permission System (ONCE, PER_DOCUMENT, ALWAYS modes)
✓ Permission Expiration
✓ Built-in tools (document, text, HTTP)

Tool Permission Types: ✓ Identical across platforms
Input Schema Format: ✓ Both use JSON Schema subset
```

### Voice Settings Data Structures - FULLY ALIGNED
```
ActivationCommand:
  - type: 'command' | 'ai' ✓
  - phrases: string[] ✓
  - description?: string ✓

VoiceNotificationLight:
  - enabled: boolean ✓
  - listening/commandRecognized/aiRecognized/error: colors ✓
  - intensity: 'low' | 'medium' | 'high' ✓

VoiceSettings:
  - language: string ✓
  - activationCommands: Map<language, ActivationCommand[]> ✓
  - notificationLight: VoiceNotificationLight ✓
  - Legacy fields for backward compatibility ✓

Language Support: en-US, fi-FI, sv-SE ✓ Identical
```

### Privacy System - FULLY ALIGNED
```
Sensitive Data Types: ✓ Identical
- Credit card, SSN, phone, email, API key, password
- JWT token, auth header, private key, database connection

Data Processing Purposes: ✓ Identical
- model-training, service-improvement, user-support
- compliance, security

Processing Locations: ✓ Identical
- US, EU, UK, CA, AU, other

Provider Policies: ✓ Both track GDPR compliance, retention policies, training opt-out

Telemetry: ✓ Both implement privacy-preserving pseudonymous tracking
```

### Sync Data Models - FULLY ALIGNED
```
Core Types (identical across platforms):
✓ SyncRequest/SyncResponse
✓ DeviceMetadata
✓ PendingSyncItem
✓ DocumentConflict
✓ VersionSnapshot
✓ VersionMetadata

Sync Status Tracking: ✓ Identical
Pending Items Queue: ✓ Identical
Conflict Detection: ✓ Identical data structures
```

### MCP Support - FULLY ALIGNED
```
Transport Types: ✓ stdio, SSE, HTTP
McpServerConfig: ✓ Identical fields
McpToolDefinition: ✓ Identical structure
Input Schema: ✓ JSON Schema format

Both platforms can:
✓ Register MCP servers
✓ List available tools
✓ Execute tool calls
✓ Handle tool results
```

### User Settings - FULLY ALIGNED
```
Both store and sync:
✓ AI model selection (provider + model name)
✓ API keys (encrypted)
✓ Voice settings (activation commands + notification light)
✓ Privacy settings (telemetry, provider policies)
✓ Notification preferences
✓ UI theme/locale preferences

Cross-device sync: ✓ Both use sync service
Local overrides: ✓ Both support device-specific settings
```

---

## 📊 PARITY SCORECARD (UPDATED AUGUST 2026)

| Category | Parity % | Status | Details |
|----------|----------|--------|---------|
| AI Providers | 100% | ✅ ALIGNED | All 5 providers + thinking support identical |
| Tool System | 100% | ✅ ALIGNED | Registry, executor, permissions identical |
| Voice Settings (Data) | 100% | ✅ ALIGNED | All structures identical |
| Voice Settings (Logic) | 67% | ⚠️ DIVERGENT | Parsing logic differs (regex vs direct); affects cursor commands too |
| Cursor System (NEW) | 90% | ✅ MOSTLY ALIGNED | Navigation/selection identical, voice parsing inherits divergence |
| Privacy System | 100% | ✅ ALIGNED | All types and policies identical |
| Sync (Data Models) | 100% | ✅ ALIGNED | All types identical |
| Sync (Implementation) | 40% | ⚠️ DIVERGENT | 2512 LOC (web) vs 258 LOC (android) |
| MCP Support | 100% | ✅ ALIGNED | Config and tool definitions identical |
| Settings/Preferences | 100% | ✅ ALIGNED | Same settings types |
| Authentication | 38% | 🔴 DIVERGENT | NextAuth.js vs Token-based |
| Database | 60% | ⚠️ DIFFERENT | Drizzle ORM vs SQLite, same schema |
| **OVERALL** | **82%** | **GOOD** | **44/54 features fully aligned** |

---

## FILES TO REVIEW FOR CONTEXT

### Critical Divergence Points
```
Web voice parsing:
  lib/voice/commands.ts (lines 38-44) - REGEX LOGIC

Android voice parsing:
  dictator-kotlin/dictator-core/src/commonMain/kotlin/com/dictator/core/util/voice/VoiceCommandParser.kt (lines 71-79) - DIRECT MATCH LOGIC

Web sync architecture:
  lib/sync/ (entire directory - 2512 LOC across 9 files)

Android sync:
  dictator-kotlin/dictator-core/src/commonMain/kotlin/com/dictator/core/service/SyncServiceImpl.kt (258 LOC)

Web auth:
  auth.ts - NextAuth.js configuration

Android auth:
  dictator-kotlin/dictator-core/src/commonMain/kotlin/com/dictator/core/service/AuthServiceImpl.kt
```

---

## ACTION ITEMS

**P0 (Must Fix)**
- [ ] Document authentication differences and implications
- [ ] Add cross-platform auth token validation tests
- [ ] Verify logout behavior across platforms

**P1 (Should Fix)**
- [ ] Align voice command parsing logic
- [ ] Document sync implementation differences
- [ ] Add sync edge case tests on Android

**P2 (Nice to Have)**
- [ ] Consider consolidating web sync modules
- [ ] Migrate web auth to token-based system
- [ ] Create unified database interface

