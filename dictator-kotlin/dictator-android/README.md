# Dictator Android App - Week 1 Setup Complete

This directory contains the Android-specific UI layer for Dictator, built with Jetpack Compose and Hilt DI.

## Project Structure

```
dictator-android/
├── src/main/
│   ├── kotlin/com/dictator/android/
│   │   ├── DictatorApplication.kt       # Hilt entry point
│   │   ├── ui/
│   │   │   ├── MainActivity.kt          # Main Compose activity
│   │   │   ├── screen/                  # Compose screens
│   │   │   │   ├── auth/                # Auth screens (coming Week 2)
│   │   │   │   ├── document/            # Document screens (coming Week 3)
│   │   │   │   ├── ai/                  # AI screens (coming Week 4)
│   │   │   │   └── settings/            # Settings screens (coming Week 5)
│   │   │   ├── component/               # Reusable components
│   │   │   └── theme/
│   │   │       ├── Theme.kt
│   │   │       ├── Typography.kt
│   │   │       └── Color.kt
│   │   ├── viewmodel/                   # Jetpack ViewModels (coming Week 2)
│   │   │   ├── AuthViewModel.kt
│   │   │   ├── DocumentViewModel.kt
│   │   │   └── EditorViewModel.kt
│   │   ├── di/                          # Hilt DI modules
│   │   │   └── CoreModule.kt
│   │   └── service/                     # Android-specific services
│   │       ├── VoiceServiceImpl.kt
│   │       └── AuthServiceImpl.kt
│   └── res/
│       ├── values/
│       │   ├── strings.xml
│       │   ├── colors.xml
│       │   └── themes.xml
│       └── xml/
│           ├── backup_rules.xml
│           └── data_extraction_rules.xml
├── build.gradle.kts                     # Android build config
└── proguard-rules.pro                   # Proguard/R8 config
```

## Setup Status - Week 1 ✅

- ✅ Gradle module configured with Jetpack Compose
- ✅ Hilt dependency injection configured
- ✅ Material 3 theme setup
- ✅ MainActivity with Compose foundation
- ✅ Core library integration
- ✅ Android SDK configuration (API 28+)
- ✅ Permissions configured
- ✅ App resources (strings, colors, themes)

## Building and Running

```bash
# Build the Android app
cd dictator-kotlin
./gradlew :dictator-android:build

# Install and run on emulator/device
./gradlew :dictator-android:installDebug

# Run tests
./gradlew :dictator-android:test
```

## Next Steps - Weeks 2-6

### Week 2 (Weeks 8-9): Authentication UI
- LoginScreen with email/password input
- SignupScreen with validation
- AuthViewModel with login/signup logic
- Local token storage with encrypted SharedPreferences

### Week 3 (Week 10): Document Management
- DocumentListScreen showing all documents
- EditorScreen with rich text editing
- DocumentViewModel for state management
- Navigation between screens

### Week 4 (Week 11): Voice Integration
- VoicePanel with SpeechRecognizer API
- Real-time voice input UI
- Command parsing display
- Error handling for voice failures

### Week 5 (Week 12): AI Integration
- AIPanel with Claude integration
- Inline prompt/response UI
- AI session management
- Streaming response display

### Week 6 (Week 13): Sync & Sharing
- SyncStatus UI showing sync state
- ShareDialog for document sharing
- Conflict resolution UI
- Share management

## Architecture

The Android app follows a layered architecture:

```
┌─────────────────────────────────┐
│      Jetpack Compose UI          │
│  (Screens & Components)          │
├─────────────────────────────────┤
│       ViewModels                 │
│  (Lifecycle & State Management)  │
├─────────────────────────────────┤
│      Hilt Dependency Injection   │
├─────────────────────────────────┤
│   Dictator Core Library (KMP)    │
│  (Services, Repositories, Data)  │
├─────────────────────────────────┤
│    Android Framework APIs        │
│ (SpeechRecognizer, Keystore, etc)│
└─────────────────────────────────┘
```

## Dependencies

### Core Libraries
- **Jetpack Compose** - Modern declarative UI framework
- **Material 3** - Material Design 3 components
- **Hilt** - Dependency injection for Android
- **Lifecycle** - Lifecycle-aware components
- **Navigation** - Compose navigation

### Dictator Integration
- **dictator-core** - Shared business logic, services, repositories

### Utilities
- **Datastore** - Encrypted preference storage
- **Coroutines** - Async operations
- **Serialization** - JSON handling
- **Napier** - Cross-platform logging

## Testing

Tests are organized into two categories:

1. **Unit Tests** (jvmTest) - Logic testing without Android framework
2. **Instrumented Tests** (androidTest) - Android-specific testing

Run tests:
```bash
./gradlew :dictator-android:test           # Unit tests
./gradlew :dictator-android:connectedAndroidTest  # Instrumented tests
```

## Configuration

Key configuration points:

- **Minimum SDK**: 28 (Android 9)
- **Target SDK**: 34 (Android 14)
- **Compose Compiler Version**: 1.5.8
- **Kotlin Version**: 1.9.25
- **AGP Version**: 8.1.4

## Development Notes

- All UI is built with Jetpack Compose (no XML layouts)
- Theme and colors are defined programmatically in Theme.kt
- Hilt provides all dependencies via constructor injection
- Core logic from dictator-core is injected into ViewModels
- DataStore is used for encrypted local preferences

## Status Summary

✅ Android module is ready for Week 2 UI development
✅ Core library integration is configured
✅ DI framework is set up
✅ All foundational infrastructure in place
