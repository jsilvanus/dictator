# Cursor System - Implementation Guide

## Summary

This guide documents the complete implementation of the cursor-based selection system with integrated privacy protections across the Dictator web and Android platforms.

## Web Implementation (TypeScript/React)

### Core System Files

**Type Definitions** (`lib/types/cursor.ts`)
- `CursorSize`: 'paragraph' | 'word' | 'character'
- `CursorPosition`: { startChar, endChar, size }
- `SelectionState`: { startPos, endPos, isActive }
- `CursorState`: { current, selection, lastAction }
- `CursorOperationResult`: { newState, feedback, selectedText, isAtBoundary }

**Navigation** (`lib/cursor/navigation.ts`)
- `findParagraphBoundary()`: Find paragraph boundaries (double newline separated)
- `findWordBoundary()`: Find word boundaries using regex
- `findCharacterBoundary()`: Single character navigation
- `moveCursorInDirection()`: Move by size unit
- `validateCursorRange()`: Clamp to document bounds
- `getTextAtCursor()`: Extract text at cursor

**Selection** (`lib/cursor/selection.ts`)
- `startSelection()`: Create active selection
- `expandSelectionTo()`: Expand selection in direction
- `collapseSelection()`: Convert selection to cursor
- `getSelectionText()`: Extract selected text
- `selectAllText()`: Select entire document
- `clearSelection()`: Clear selection state
- `hasSelection()`: Check if selection active

### Voice Integration

**Command Parsing** (`lib/voice/cursor-parser.ts`)
- `containsCursorKeywords()`: Detect if text contains cursor keywords
- `parseCursorCommandsFromText()`: Extract recognized commands
- `detectCursorSize()`: Identify cursor size from commands
- `extractCursorIntent()`: Full intent extraction

**Command Execution** (`lib/voice/cursor-commands.ts`)
- `parseCursorCommand()`: Parse voice text into commands
- `executeCursorCommands()`: Execute command sequence
- `handleCursorCommand()`: High-level command handler

**Language Support** (`lib/data/cursor-command-defaults.ts`)
- Predefined commands: en-US, fi-FI, sv-SE
- Support for custom user aliases
- Command phrase variations

### UI Components

**Cursor Indicator** (`components/editor/CursorIndicator.tsx`)
- Displays current cursor size visually
- Shows position and selection information
- Updates in real-time as cursor moves

**VoiceDock Integration** (`components/editor/VoiceDock.tsx`)
- Cursor size buttons (paragraph/word/character)
- Detects cursor commands in voice input
- Handles command execution
- Provides visual feedback

**Settings Page** (`app/(app)/settings/cursor-settings.tsx`)
- Set default cursor size
- View all available commands by language
- Add custom voice aliases
- Test command recognition

### Context Provider

**CursorProvider** (`components/providers/CursorProvider.tsx`)
- React Context for cursor state management
- Methods: setCursorSize, moveCursor, startSelectMode, expandSelection, endSelection, selectAll
- Returns feedback for voice response

### Privacy Integration

**PII Detection** (`lib/privacy/SensitiveDataDetector.ts`)
- Scans selected text for PII
- Pattern matching for multiple data types
- Confidence scoring
- Risk level assessment

**Permission Dialog** (`components/editor/SelectionPermissionDialog.tsx`)
- Shows detected PII types
- Displays risk level
- Provides permission options
- Voice-enabled approval

**VoiceDock AI Safety** (`components/editor/VoiceDock.tsx`)
- Checks for PII before sending to AI
- Prompts user if PII detected
- Blocks AI request until permission granted

## Android Implementation (Kotlin)

### Type Definitions

**Cursor Types** (`domain/entity/CursorTypes.kt`)
```kotlin
enum class CursorSize { PARAGRAPH, WORD, CHARACTER }
data class CursorPosition(val startChar: Int, val endChar: Int, val size: CursorSize)
data class SelectionState(val startPos: CursorPosition, val endPos: CursorPosition, val isActive: Boolean)
data class CursorState(val current: CursorPosition, val selection: SelectionState?, val lastAction: String)
data class CursorOperationResult(val newState: CursorState, val feedback: String, val selectedText: String?, val isAtBoundary: Boolean)
```

### Navigation Functions

**CursorNavigation.kt** (`util/cursor/CursorNavigation.kt`)
- `findParagraphBoundary()`: Find paragraph boundaries
- `findWordBoundary()`: Find word boundaries
- `findCharacterBoundary()`: Find character boundaries
- `moveCursorInDirection()`: Move cursor in direction
- `validateCursorRange()`: Validate cursor range
- `getTextAtCursor()`: Get text at cursor

### Selection Functions

**CursorSelection.kt** (`util/cursor/CursorSelection.kt`)
- `startSelection()`: Start selection
- `expandSelectionTo()`: Expand selection
- `collapseSelection()`: Collapse selection
- `getSelectionText()`: Get selected text
- `clearSelection()`: Clear selection
- `selectAllText()`: Select all text
- `hasSelection()`: Check if selection active

### Voice Integration

The Android implementation integrates with existing VoiceCommandParser:

**VoiceCommandParser.kt** updates:
- Detect cursor keywords
- Parse cursor commands
- Identify cursor size changes

### Planned: Android UI Components

**Cursor Indicator** (Android Jetpack Compose)
- Display current cursor size
- Show position information
- Real-time updates

**Voice Panel Buttons** (Android Jetpack Compose)
- Cursor size buttons in voice panel
- Same three sizes as web

**Settings Integration** (Android Jetpack Compose)
- Cursor preferences UI
- Default size selection
- Command testing

## Database Schema

**User Preferences** (`drizzle/0014_add_cursor_selection_system.sql`)
- `defaultCursorSize`: Preferred cursor size
- `customCommandAliases`: User-defined command aliases

**Privacy Audit Log**
- `privacyAuditLog`: Tracks PII detection and permission grants
- Includes: user, detection timestamp, PII types, permission granted

## Integration Workflow

### 1. Voice Input → Command Detection
```
Raw voice text
  ↓
normalizeSpokenPunctuation()
  ↓
parseTriggers() [identify command segment]
  ↓
containsCursorKeywords() [check if cursor command]
```

### 2. Cursor Command Execution
```
Cursor command detected
  ↓
handleCursorCommand()
  ↓
parseCursorCommand() [break into individual commands]
  ↓
executeCursorCommands() [execute each command sequentially]
  ↓
Update cursor state via CursorProvider
```

### 3. AI Safety Check
```
AI requested with selected text
  ↓
scanForSensitiveData()
  ↓
Detect PII?
  ├─ YES → Show SelectionPermissionDialog
  │        ↓
  │        User grants permission?
  │        ├─ YES → proceedWithAiRequest()
  │        └─ NO  → Cancel request
  └─ NO  → proceedWithAiRequest()
```

## Testing

**Unit Tests** (`tests/unit/cursor-system.test.ts`)
- 31/31 tests passing
- Coverage: navigation, selection, voice parsing, language-specific commands

**Manual Testing**
- Test cursor commands with "Test Your Commands" feature
- Test PII detection with sample sensitive data
- Test permission dialog flows
- Test custom aliases

## Performance Considerations

1. **Cursor Movement**: O(n) text scanning for boundaries (optimized with early termination)
2. **Selection**: Efficient state updates via React Context
3. **PII Scanning**: Pattern matching with early termination
4. **Voice Parsing**: Minimal overhead, executed in user callback

## Security Considerations

1. **Client-Side PII Detection**: Runs locally before network transmission
2. **Permission Tracking**: Audit log of all PII detections and permissions
3. **Scope Limiting**: Selections used only with explicit user permission
4. **Provider Policies**: Different policies per AI provider (privacy/data retention)

## Future Enhancements

1. **AI-Powered Boundary Detection**: Use AI to identify semantic boundaries
2. **Multi-Language Support**: Add more language command definitions
3. **Gesture-Based Cursor**: Combine voice with gesture for cursor control
4. **Predictive Selection**: Suggest selections based on context
5. **Historical Aliases**: Learn from user patterns
6. **Android Audio Feedback**: Beep on cursor movement
7. **Clipboard Integration**: Copy/paste selected text

## Documentation References

- User Guide: `USER_GUIDE_CURSOR_FEATURES.md`
- Original Implementation: `CURSOR_SYSTEM_IMPLEMENTATION.md`
- Web Architecture: Internal code comments
- Android Integration: This file + code comments
