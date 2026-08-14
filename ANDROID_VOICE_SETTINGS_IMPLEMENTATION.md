# Language-Specific Voice Activation Commands - Android Implementation

## Overview

This implementation adds comprehensive support for language-specific voice activation commands to the Dictator Android client, mirroring the web version functionality. Users can now customize their voice activation phrases per language with full persistence and backward compatibility.

## Features

### 1. Language-Specific Activation Commands
- **Supported Languages**: English (en-US), Finnish (fi-FI), Swedish (sv-SE)
- **Multiple Phrases per Command**: Each activation command can have multiple phrases (e.g., "Computer", "Start", "Begin" all trigger dictation)
- **Two Command Types**: "command" (dictation mode) and "ai" (AI mode)

### 2. Data Models (dictator-core)

#### VoiceSettingsTypes.kt
```kotlin
@Serializable
data class ActivationCommand(
    val type: String,           // "command" or "ai"
    val phrases: List<String>,  // Multiple trigger phrases
    val description: String? = null
)

@Serializable
data class VoiceNotificationLight(
    val enabled: Boolean,
    val listening: String,      // Color codes like "#0066FF"
    val commandRecognized: String,
    val aiRecognized: String,
    val error: String,
    val intensity: String       // "low", "medium", "high"
)

@Serializable
data class VoiceSettings(
    val language: String,
    val activationCommands: Map<String, List<ActivationCommand>>,
    val notificationLight: VoiceNotificationLight,
    val legacyCommandTrigger: String?,  // Backward compatibility
    val legacyAiTrigger: String?        // Backward compatibility
)
```

### 3. Default Settings (VoiceSettingsDefaults.kt)

Provides default activation commands for each supported language:
- English: "Computer" / "Assistant"
- Finnish: "Tietokone" / "Avustaja"
- Swedish: "Dator" / "Assistent"

Helper functions:
- `getDefaultActivationCommandsForLanguage(language: String)`
- `getActivationCommandForLanguage(language, type, customCommands?)`
- `getActivationPhrasesForLanguage(language, type, customCommands?)`

### 4. Persistence Layer (VoiceSettingsRepository.kt)

Manages storage and retrieval of voice settings with backward compatibility:

**Key Methods:**
- `loadVoiceSettings()`: Load settings with automatic migration from legacy format
- `saveVoiceSettings(settings)`
- `setLanguage(language)`
- `setActivationCommandsForLanguage(language, commands)`
- `setNotificationLight(light)`
- `getActivationCommandsForLanguage(language)`
- `getActivationPhrase(language, type)`
- `getActivationPhrases(language, type)`

**Backward Compatibility:**
- Automatically falls back to legacy `commandTrigger` and `aiTrigger` settings
- Migrates old format to new format on first load
- Saves in new format for future use

### 5. Voice Command Parser Updates

Updated `VoiceCommandParser.kt` to support language-specific commands:

```kotlin
fun parseCommand(
    voiceInput: String,
    activationCommands: List<ActivationCommand>? = null,
    language: String? = null
): ParsedCommand?
```

**New Command Types:**
- `CommandType.ACTIVATE_DICTATION`: Triggered by command activation phrases
- `CommandType.ACTIVATE_AI`: Triggered by AI activation phrases

**Matching Logic:**
1. Checks activation commands first (if provided)
2. Falls back to standard command patterns
3. Case-insensitive matching for user convenience

### 6. VoiceViewModel Updates

Enhanced with language-specific command support:

**New State:**
- `currentLanguage: String`: Current active language
- `activationCommands: List<ActivationCommand>`: Commands for current language

**New Methods:**
- `setLanguage(language)`: Update language and reload commands
- `getCurrentActivationCommands()`: Get commands for active language
- `getActivationPhrases(type)`: Get phrases for specific command type

**Auto-load:**
- Automatically loads voice settings and current language on initialization

### 7. UI Components (VoiceSettingsScreen.kt)

Provides complete UI for managing voice settings:

**Features:**
- Language selector dropdown
- Editable activation commands per language
- Per-phrase management (add/remove)
- Notification light color customization
- Animation intensity configuration
- Reset to defaults option

**Composables:**
- `VoiceSettingsScreen()`: Main settings screen
- `ActivationCommandCard()`: Individual command editor
- `ColorSettingRow()`: Color picker for notification light

### 8. Integration Points

**AndroidVoiceServiceImpl.kt:**
- Added `setLanguage(language)` to load language-specific commands
- Added `getActivationCommands()` to retrieve commands for voice matching
- Commands can be passed to speech recognizer for more accurate detection

**SettingsViewModel.kt:**
- Added `voiceSettings` to `SettingsState`
- Added `loadVoiceSettings()` to initialize voice settings
- Added `setLanguage(language)` to update and persist language

**SettingsScreen Integration:**
- Can embed `VoiceSettingsScreen()` in settings navigation
- Connected to SettingsViewModel for state management

## Testing

### Test Coverage
- **VoiceSettingsTest.kt**: 15 tests for data models and defaults
  - Default command validation for each language
  - Helper function behavior
  - Backward compatibility handling
- **VoiceCommandParserTest.kt**: 11 new tests for language-specific parsing
  - Activation command detection
  - Multi-phrase matching
  - Language-specific triggers
  - Fallback to standard commands

## Backward Compatibility

The implementation is fully backward compatible:

1. **Optional Fields**: Both `activationCommands` and `voiceNotificationLight` are optional
2. **Automatic Defaults**: New users get sensible defaults automatically
3. **Legacy Fallback**: Old settings are automatically migrated to new format
4. **No Breaking Changes**: Existing functionality works unchanged for users who don't adopt new features

### Migration Path
When loading settings:
1. Check for new format first
2. If found, use it
3. If not found, check for legacy settings
4. Migrate to new format
5. Save in new format for future use

## Usage Examples

### Load and Display Settings
```kotlin
val repository = VoiceSettingsRepository(sharedPreferences)
val settings = repository.loadVoiceSettings()

println("Current language: ${settings.language}")
val commands = settings.activationCommands[settings.language]
println("Activation commands: $commands")
```

### Update Language
```kotlin
viewModel.setLanguage("fi-FI")
// Automatically loads Finnish activation commands
```

### Parse Voice Input
```kotlin
val commands = voiceSettings.activationCommands["en-US"]
val parsed = VoiceCommandParser.parseCommand(
    voiceInput = "Computer",
    activationCommands = commands,
    language = "en-US"
)
if (parsed?.type == CommandType.ACTIVATE_DICTATION) {
    // Start dictation mode
}
```

### Customize Commands
```kotlin
val customCommands = listOf(
    ActivationCommand("command", listOf("Start", "Begin", "Go"), "Start dictation"),
    ActivationCommand("ai", listOf("Help", "Ask"), "Start AI mode")
)
repository.setActivationCommandsForLanguage("en-US", customCommands)
```

## Files Modified/Created

### Created Files
- `dictator-core/src/commonMain/kotlin/com/dictator/core/data/voice/VoiceSettingsTypes.kt`
- `dictator-core/src/commonMain/kotlin/com/dictator/core/data/voice/VoiceSettingsDefaults.kt`
- `dictator-core/src/commonMain/kotlin/com/dictator/core/data/local/VoiceSettingsRepository.kt`
- `dictator-android/src/main/kotlin/com/dictator/android/ui/voice/VoiceSettingsScreen.kt`
- `dictator-core/src/commonTest/kotlin/com/dictator/core/data/voice/VoiceSettingsTest.kt`

### Modified Files
- `dictator-core/src/commonMain/kotlin/com/dictator/core/util/voice/VoiceCommandParser.kt`
- `dictator-android/src/main/kotlin/com/dictator/android/ui/voice/VoiceViewModel.kt`
- `dictator-android/src/main/kotlin/com/dictator/android/data/AndroidVoiceServiceImpl.kt`
- `dictator-android/src/main/kotlin/com/dictator/android/ui/settings/SettingsViewModel.kt`
- `dictator-core/src/commonTest/kotlin/com/dictator/core/util/voice/VoiceCommandParserTest.kt`

## Architecture & Patterns

### Design Patterns
- **Repository Pattern**: `VoiceSettingsRepository` provides clean data access abstraction
- **State Management**: ViewModel with StateFlow for reactive UI updates
- **Composition**: Composable UI components following Material 3 guidelines
- **Serialization**: kotlinx.serialization for JSON persistence

### Key Principles
- **Single Responsibility**: Each class has one clear purpose
- **Open/Closed**: Can extend without modifying existing code
- **Dependency Inversion**: Depends on abstractions (interfaces)
- **DRY**: No repeated code, reusable helpers

## Future Enhancements

1. **Voice Profile Support**: Save multiple voice profiles per user
2. **Custom Activation Sounds**: Different audio feedback per language
3. **Multi-phrase Aliases**: Support synonyms and regional variations
4. **Machine Learning**: Learn user speech patterns for better recognition
5. **Voice Activity Detection**: Visualize audio levels during listening
6. **Confidence Threshold Settings**: Adjust how sensitive activation is

## Known Limitations

1. **Color Picker**: VoiceSettingsScreen uses simple text entry for hex colors (can be enhanced with full color picker)
2. **No Real Localization**: Strings are hardcoded (should use Android string resources)
3. **Manual Testing Only**: Unit tests don't cover Android-specific voice recognition APIs

## Migration Guide

For existing users upgrading to this version:

1. **Automatic**: No action needed - settings automatically migrated
2. **Optional**: Visit Settings > Voice Settings to customize activation commands
3. **Safe**: Old settings preserved; can always reset to defaults
4. **Per-Language**: Each language has independent settings

## Performance Considerations

- **Lazy Loading**: Voice settings loaded on first access
- **Caching**: Settings cached in memory after first load
- **Efficient Parsing**: Activation commands checked before standard patterns
- **Minimal Overhead**: No impact on voice recognition performance
