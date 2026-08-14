# Dictator Kotlin Port - Multi-Platform Development Plan

## Executive Summary

This document outlines a comprehensive multi-platform port of Dictator from TypeScript/Next.js web using a **modular Kotlin core** with platform-specific UIs. Dictator is a voice-to-text rich document editor with AI capabilities, designed for accessibility-first document creation.

The strategy prioritizes building a **Kotlin Multiplatform (KMP) core** first, then layering platform-specific UIs on top:
1. **Phase 1-2 (Weeks 1-6):** Kotlin Core (shared business logic, data layer, services)
2. **Phase 3-5 (Weeks 7-14):** Android UI (Jetpack Compose) on top of core
3. **Phase 6+ (Weeks 15+):** KMP extensions and Desktop/Web clients

**Current Status:** The web version (TypeScript/Next.js) is feature-complete with 11 fully implemented development phases.

**Target Platforms (Phased):**
- **Phase 1-2:** Kotlin Core (JVM library)
- **Phase 3-5:** Android (API 28+), with primary support for modern Android versions (API 31+)
- **Phase 6+:** Kotlin Multiplatform (KMP), Desktop (Compose Multiplatform), Web (KMP + browser runtime)

**Estimated Timeline:** 6 weeks core, 8 weeks Android, 10+ weeks KMP/Desktop

---

## 1. Architecture Overview & Tech Stack

### 1.1 Web Stack (Current Implementation)
```
Frontend: Next.js 15, React 19, TypeScript, Tiptap (rich text editor)
Backend: Next.js API routes, Auth.js v5
Database: PostgreSQL 14+ with Drizzle ORM
Voice: Web Speech Recognition API
AI: Anthropic Claude Sonnet 4.6 via REST API
```

### 1.2 Modular Kotlin Architecture (Multi-Platform)

The architecture is organized in **layers**, with a platform-agnostic **Kotlin Core** supporting multiple UI platforms:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Platform UI Layers                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Android UI       │  │ Desktop UI       │  │ KMP UI       │  │
│  │ (Jetpack         │  │ (Compose MP)     │  │ (Compose MP) │  │
│  │ Compose)         │  │                  │  │              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                 KOTLIN CORE (Shared Library)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Domain Layer (Use Cases, Entities, Repositories)         │  │
│  │  ┌─────────────┬──────────────┬──────────────┐           │  │
│  │  │ Repositories│ Use Cases    │ Entities     │           │  │
│  │  └─────────────┴──────────────┴──────────────┘           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Service Layer (Business Logic)                           │  │
│  │  ┌──────────────┬─────────────┬──────────────┐           │  │
│  │  │ VoiceService │ AIService   │ SyncService  │           │  │
│  │  └──────────────┴─────────────┴──────────────┘           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Data Access Layer (DAO, Local/Remote Data Sources)       │  │
│  │  ┌───────────────┬──────────────────────┐               │  │
│  │  │ Local Storage │ Remote API Client    │               │  │
│  │  │ (SQLite, etc) │ (REST, gRPC, etc)    │               │  │
│  │  └───────────────┴──────────────────────┘               │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Utility Layer (Validation, Encryption, Helpers)         │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│              Platform-Specific Implementations                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Android          │  │ Desktop          │  │ iOS (Future) │  │
│  │ (SpeechRecognizer│  │ (OS APIs)        │  │              │  │
│  │  Keystore, etc)  │  │                  │  │              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Kotlin Core Stack (Platform-Agnostic)

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Language** | Kotlin | JVM-based with full multiplatform support via KMP |
| **Async** | Coroutines + Flow | Kotlin standard, works across all platforms |
| **JSON/Serialization** | Kotlinx Serialization | Multiplatform-compatible, KMP-native |
| **Database** | SQLDelight or exposed-dao | Multiplatform support across Android, Desktop, iOS |
| **DI Container** | Koin | Lightweight, KMP-compatible DI framework |
| **HTTP Client** | Ktor Client | Multiplatform HTTP client with common networking layer |
| **Logging** | Napier or kermit | KMP-compatible logging |
| **Utilities** | kotlinx.datetime, UUID | Multiplatform standard libraries |

### 1.4 Android UI Stack (Platform-Specific)

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **UI Framework** | Jetpack Compose | Modern declarative UI, parallels React paradigm |
| **Database** | Room + SQLite | Android standard, integrates with Kotlin Core via SQLDelight |
| **Navigation** | Jetpack Navigation Compose | Type-safe, composable navigation |
| **Authentication** | OAuth 2.0 + JWT (Keystore) | Android secure storage, OAuth 2.0 flow |
| **Voice Recognition** | SpeechRecognizer API | Platform-native voice capture |
| **Dependency Injection** | Hilt | Android integration with Koin core DI |
| **Rich Text Editor** | Custom Compose or WebView | No perfect match; hybrid approach recommended |
| **State Management** | ViewModel + StateFlow | Lifecycle-aware, integrates with Compose |

### 1.5 Desktop UI Stack (Future - Phase 6+)

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **UI Framework** | Jetpack Compose Multiplatform | Share 60-80% UI code across platforms |
| **Language** | Kotlin (KMP) | Compile to JVM/native for Windows, macOS, Linux |
| **Database** | SQLDelight (multiplatform) | Same as core, cross-platform support |
| **Voice Recognition** | Platform APIs via KMP expect | OS-native voice APIs abstracted in core |
| **File System** | Kotlin stdlib + okio | Cross-platform file operations |
| **Native Integration** | JNA or JNI | Access OS-specific features (clipboard, file dialogs) |

---

## 2. Feature Mapping: 11 Development Phases

### Phase 1: Basic Authentication & User Management (Optional)
**Web Components:** Auth flow, User model, JWT session handling  
**Android Implementation:**
- **Optional Login:** User can use app in offline mode without authentication
- OAuth 2.0 flow using Chrome Custom Tabs (for authenticated sync)
- JWT storage in Android Keystore (only when logged in)
- ViewModel-based auth state (LoginViewModel, SignupViewModel)
- Retrofit interceptor for JWT auto-attachment to requests (only when authenticated)
- Local-only mode: Full document functionality without backend connection

### Phase 2: Document & Folder Creation
**Web Components:** Document CRUD, Folder hierarchy, file browser UI  
**Android Implementation:**
- Room entities: User, Folder, Document
- RepositoryPattern DAOs for data access
- MVI/MVVM for list screens (DocumentListScreen, FolderBrowserScreen)
- Compose LazyColumn for efficient rendering

### Phase 3: Rich Text Editor
**Web Components:** Tiptap editor with extensions, formatting toolbar  
**Android Implementation:**
- **Hybrid Option A:** Compose-based custom editor with richtexteditor Compose library
- **Hybrid Option B:** WebView wrapping Tiptap.js (bridge communication via JS interface)
- Text formatting state management in ViewModel
- Undo/redo stack (implemented via Room history table)

### Phase 4: Collaborative Features & Sharing
**Web Components:** Document sharing, real-time collaboration setup  
**Android Implementation:**
- Document permission model (Share entity) in Room
- REST API calls to sync share state
- Share link generation and QR code display
- Initial architecture for real-time sync (Firebase Realtime DB or Socket.IO optional)

### Phase 5: Voice Input - Basic Commands
**Web Components:** SpeechRecognizer integration, command parsing  
**Android Implementation:**
- SpeechRecognizer API for voice capture
- Mimic `lib/voice/commands.ts` parseTriggers() in Kotlin
- Voice permission handling (RECORD_AUDIO)
- Voice dock UI in Compose

### Phase 6: Voice Input - Punctuation Normalization
**Web Components:** Punctuation mapping, regex normalization  
**Android Implementation:**
- Direct port of `lib/voice/punctuation.ts` mappings to Kotlin
- Extension function: `String.normalizePunctuation()`
- Integration with editor before commit

### Phase 7: Voice Input - Advanced Features
**Web Components:** Continuous listening, command history, settings  
**Android Implementation:**
- Background voice service (BoundService)
- Notification for active voice listening
- Persistent command history in Room

### Phase 8: AI - Inline Editing (Claude API)
**Web Components:** Inline prompt execution, streaming responses  
**Android Implementation:**
- Retrofit streaming for Claude API responses
- Flow-based response collection in ViewModel
- UI handling for streaming text insertion
- Rate limiting: in-memory Map with cleanup (or Redis if multi-server)

### Phase 9: AI - AI Panel Mode
**Web Components:** Sidebar AI assistant, session persistence  
**Android Implementation:**
- AI panel as bottom sheet or side drawer (Compose BottomSheetScaffold)
- AiSession and AiTurn entities in Room (matching web schema)
- StateFlow-based conversation history
- Conversation switching and loading

### Phase 10: AI - Advanced Features
**Web Components:** Conversation export, settings, suggestions  
**Android Implementation:**
- Export to PDF (Android Print framework)
- Settings Activity with preference DataStore
- AI suggestions queue (similar to web implementation)

### Phase 11: Settings, Security & Deployment
**Web Components:** Security settings, 2FA, API keys, deployment  
**Android Implementation:**
- EncryptedSharedPreferences for credential storage
- Biometric auth (AndroidX BiometricPrompt)
- Settings activity with preference groups
- Google Play App Signing
- Release APK signing with keystore

---

## 2.A. Kotlin Port Plan Phases (Multi-Platform Development Strategy)

The Dictator Kotlin port is organized into **3 major phases**, enabling progressive build-out from a shared core to multiple platforms:

### Phase A: Kotlin Core Library (Weeks 1-6) - Platform-Agnostic Foundation

**Objective:** Build a reusable, testable Kotlin library containing all business logic, services, and data access layers.

**Deliverables:**
- Core library module (`:dictator-core` or similar)
- All domain entities (Document, User, Folder, AISession, etc.)
- Repository interfaces and implementations
- Service layer (VoiceService, AIService, SyncService, AuthService)
- Data access layer (database schema for SQLDelight, API client abstractions)
- Utility functions (punctuation normalization, voice parsing, encryption)

**Key Activities:**
| Week | Activity | Output |
|------|----------|--------|
| 1 | Project setup: Gradle multimodule, Koin DI, SQLDelight schema | Core module structure, build.gradle.kts |
| 2 | Domain entities and database schema | Kotlin entities, SQLDelight migrations |
| 3 | Repository layer + local data source | DAO implementations, database operations |
| 4 | Remote data source + API client abstraction | Ktor client setup, API service interfaces |
| 5 | Service layer (business logic) | VoiceService, AIService, SyncService, AuthService implementations |
| 6 | Unit tests + integration tests | 80%+ code coverage for core logic |

**Dependencies (Core Library):**
```kotlin
// Core Kotlin dependencies (multiplatform-compatible)
- kotlinx-coroutines-core
- kotlinx-serialization
- sqldelight (multiplatform)
- ktor-client-core
- koin-core
- kotlinx-datetime
- uuid
```

**Architecture Inside Core:**
```
dictator-core/
├── src/main/kotlin/com/example/dictator/
│   ├── domain/                 # Entities, interfaces
│   │   ├── entity/             # User, Document, Folder, AISession
│   │   └── repository/         # Repository interfaces
│   ├── data/                   # Implementations
│   │   ├── local/              # SQLDelight DAOs
│   │   ├── remote/             # Ktor API client
│   │   └── repository/         # Repository implementations
│   ├── service/                # Business logic layer
│   │   ├── VoiceService
│   │   ├── AIService
│   │   ├── SyncService
│   │   ├── AuthService
│   │   └── DocumentService
│   └── util/                   # Helpers
│       ├── voice/              # parseTriggers, normalizePunctuation
│       ├── crypto/             # Encryption utilities
│       └── validators/         # Input validation
└── src/test/kotlin/            # Unit tests (70% of tests)
```

**Completion Criteria:**
- [ ] All domain entities ported from web
- [ ] All repositories with local + remote data sources
- [ ] All services implemented (Voice, AI, Sync, Auth)
- [ ] 80%+ unit test coverage
- [ ] Core library compiles and publishes to local Maven repo
- [ ] No platform-specific code (no Android, no UI framework)

---

### Phase B: Android UI Layer (Weeks 7-14) - Android-Specific Implementation

**Objective:** Build Android-specific UI using Jetpack Compose on top of the Kotlin Core library.

**Depends On:** Phase A (Kotlin Core)

**Deliverables:**
- Android app module (`:android` or `:dictator-android`)
- Jetpack Compose screens and components
- ViewModel layer (lifecycle-aware state management)
- Hilt dependency injection configuration
- Android-specific implementations (SpeechRecognizer, Keystore, etc.)
- Android SDK integration (notifications, permissions, etc.)

**Key Activities:**
| Week | Activity | Output |
|------|----------|--------|
| 7 | Android project setup: Gradle, Compose, Hilt | Android module structure |
| 8-9 | Authentication screens + local storage (integrate core) | LoginScreen, SignupScreen, ViewModel |
| 10 | Document management screens (list, create, edit) | DocumentListScreen, EditorScreen |
| 11 | Voice integration + UI (SpeechRecognizer API) | VoicePanel, voice input UI |
| 12 | AI integration (Claude API via core) | AIPanel, inline AI UI |
| 13 | Sync UI, share links, conflict resolution | SyncStatus, ShareDialog |
| 14 | Polish, testing, Play Store preparation | UI/UX refinements, Play Store assets |

**Architecture Inside Android App:**
```
dictator-android/
├── src/main/kotlin/com/example/dictator/
│   ├── ui/                     # Compose screens & components
│   │   ├── screen/
│   │   │   ├── auth/           # AuthScreen, LoginScreen
│   │   │   ├── document/       # DocumentListScreen, EditorScreen
│   │   │   ├── ai/             # AIPanelScreen
│   │   │   └── settings/       # SettingsScreen
│   │   └── component/          # Reusable Compose components
│   ├── viewmodel/              # ViewModels (Lifecycle-aware)
│   │   ├── AuthViewModel
│   │   ├── DocumentViewModel
│   │   ├── EditorViewModel
│   │   └── AIViewModel
│   ├── di/                     # Hilt modules
│   ├── service/                # Android-specific services
│   │   ├── VoiceServiceImpl     # SpeechRecognizer API
│   │   └── AuthServiceImpl      # Keystore + OAuth
│   └── MainActivity.kt
├── src/main/res/               # Android resources
└── src/androidTest/            # Instrumented tests (20% of tests)
```

**Android-Specific Dependencies:**
```kotlin
// Jetpack & AndroidX
- androidx-compose-ui
- androidx-lifecycle-viewmodel
- androidx-compose-material3
- androidx-navigation-compose

// Hilt & DI
- hilt-android
- hilt-navigation-compose

// Sensors & OS APIs
- android-core-speech-recognizer
- androidx-security-crypto
```

**Completion Criteria:**
- [ ] All UI screens built in Compose
- [ ] ViewModels with proper lifecycle management
- [ ] Android-specific services integrated with core
- [ ] 80%+ test coverage (20% instrumented tests)
- [ ] Play Store submission ready
- [ ] Full feature parity with web version
- [ ] Performance: <2s document load, <1s voice recognition

---

### Phase C: Kotlin Multiplatform (KMP) Extensions (Weeks 15+) - Desktop & Future Platforms

**Objective:** Enable reuse of core + UI code across Desktop (Windows, macOS, Linux) and prepare for iOS.

**Depends On:** Phase A + Phase B

**Scope (Post-MVP):**

#### Phase C.1: KMP Core Migration (Weeks 15-17)
Refactor Kotlin Core to be KMP-compatible:
- Convert SQLDelight to KMP-compatible queries
- Replace Android-specific libraries with KMP equivalents
- Update Ktor client for multiplatform support
- Add `expect/actual` declarations for platform APIs

**Activities:**
- Migrate SQLDelight to work on `commonMain` source set
- Replace Android-specific JSON/serialization with KMP versions
- Create platform-specific implementations folder structure
- Add iOS and Desktop target configurations

#### Phase C.2: Compose Multiplatform UI (Weeks 18-20)
Share UI code across platforms using Compose Multiplatform:
- Extract 60-80% of Compose UI to `commonMain`
- Platform-specific implementations for Android, Desktop, iOS
- Shared theme and design system
- Navigation abstraction layer

**Architecture:**
```
dictator-kmp/
├── shared/                     # Shared code for all platforms
│   ├── commonMain/
│   │   ├── kotlin/
│   │   │   ├── ui/             # Compose Multiplatform screens
│   │   │   ├── viewmodel/      # Shared ViewModels
│   │   │   └── theme/          # Design system
│   │   └── resources/          # Shared strings, colors
│   └── androidMain/            # Android-specific overrides
│
├── android/                    # Android app (depends on shared)
├── desktop/                    # Desktop app (depends on shared)
│   └── src/main/kotlin/
│       ├── main.kt             # Desktop entry point
│       └── platform/           # JVM-specific implementations
└── ios/                        # iOS app (future phase)
```

**KMP Stack:**
- **Language:** Kotlin Multiplatform
- **Build:** Gradle with KMP plugin
- **Targets:** `jvm`, `android`, `iosArm64`, `iosSimulatorArm64`, `iosX64`
- **UI Framework:** Jetpack Compose Multiplatform
- **Database:** SQLDelight (multiplatform)
- **DI:** Koin with KMP support
- **HTTP:** Ktor Client (multiplatform)

#### Phase C.3: Desktop App (Windows, macOS, Linux) (Weeks 20+)
Build standalone desktop application:
- Gradle-based JVM compilation (ComposeDesktop)
- Platform-native file dialogs, clipboard, notifications
- Installer packages (MSI for Windows, DMG for macOS, AppImage for Linux)
- Auto-update mechanism

#### Phase C.4: iOS App (Weeks 25+, Optional)
Leverage KMP core to build iOS UI:
- Swift UI wrapping Kotlin via Kotlin/Native
- Or: SwiftUI rewritten from Kotlin domain code
- Shared business logic via Kotlin/Native framework

---

### Phase Dependency Chart

```
Phase A: Kotlin Core (Weeks 1-6)
    ↓ (depends on)
Phase B: Android UI (Weeks 7-14)
    ↓ (optionally extends to KMP)
Phase C1: KMP Core Migration (Weeks 15-17)
    ↓ (depends on)
Phase C2: Compose Multiplatform UI (Weeks 18-20)
    ↓ (enables)
Phase C3: Desktop App (Weeks 20+)
Phase C4: iOS App (Weeks 25+)
```

### Repository Structure After All Phases

```
dictator-mono/
├── core/                       # Phase A output (Kotlin Core library)
├── android/                    # Phase B output (Android app)
├── kmp/                        # Phase C1-2 output (Multiplatform core + UI)
│   ├── shared/                 # Compose MP shared code
│   ├── android/                # Android variant
│   ├── desktop/                # Desktop (JVM) variant
│   └── ios/                    # iOS variant (Phase C4)
├── docs/
│   └── KOTLIN_PORT_PLAN.md    # This document
└── web/                        # Existing Next.js (unchanged)
```

---

## 3. Authentication & Sync Strategy

### Optional Authentication Model
The Android port implements a **progressive authentication** model:
- **Offline Mode (No Auth):** Users can create, edit, and delete documents locally without logging in. All features work: voice input, AI (with API key), rich text editing.
- **Sync Mode (Auth Required):** Users can optionally log in to enable cloud sync, share documents with others, and keep multiple devices in sync.
- **Hybrid Model:** Users start offline, can add authentication at any time to enable sync without losing local data.

### Sync API Integration (Phase 0)
The sync strategy implements device-aware synchronization from SYNC_API_PHASE0.md:
- **Device Tracking:** Each document tracks `lastModifiedDevice` ('web' or 'android') and `deviceVersion` for conflict detection
- **Incremental Sync:** `/api/documents/:id/sync?since=timestamp` only downloads changes since last sync
- **Pending Queue:** Changes are queued locally in `pending_sync_queue` table until both authenticated and online
- **Conflict Resolution:** Last-write-wins with device awareness; conflicts stored in `document_conflicts` table for manual resolution
- **Version Metadata:** `SyncMetadata` table tracks local/remote versions and sync status per document

### API Endpoints for Sync
- **GET `/api/documents/:id/sync`**: Fetch document with incremental changes since timestamp
- **PUT `/api/documents/:id/sync`**: Push local changes with device metadata
- **POST `/api/documents/:id/versions`**: Fetch version history for a document
- **GET `/api/sync/status`**: Check sync status for all documents

---

## 3. Data Model Mapping (Phase A: Kotlin Core)

### Current Web Schema (PostgreSQL via Drizzle)

```typescript
// 6 tables:
- users (id, email, name, created_at)
- folders (id, name, user_id, parent_id, created_at)
- documents (id, title, folder_id, user_id, created_at, updated_at)
- document_versions (id, document_id, content, version, created_by)
- shares (id, document_id, shared_with_user_id, permission, created_at)
- ai_sessions (id, user_id, mode, turns[], metadata, created_at)
```

### Kotlin Core Data Model (SQLDelight, Multiplatform)

The Kotlin Core library defines all entities using SQLDelight (multiplatform ORM). These entities work across Android, Desktop, and iOS through SQLDelight's multiplatform support.

```kotlin
// src/commonMain/sqldelight/schema.sq

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    parent_id TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    folder_id TEXT NOT NULL,
    user_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_modified_device TEXT DEFAULT 'kotlin',
    device_version INTEGER DEFAULT 1,
    FOREIGN KEY (folder_id) REFERENCES folders(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ... more tables defined similarly
```

These map to Kotlin data classes:

```kotlin
data class User(
    val id: String,
    val email: String,
    val name: String?,
    val createdAt: Long
)

data class Folder(
    val id: String,
    val name: String,
    val userId: String,
    val parentId: String?,
    val createdAt: Long
)

data class Document(
    val id: String,
    val title: String,
    val folderId: String,
    val userId: String?,  // Nullable for offline-first mode
    val createdAt: Long,
    val updatedAt: Long,
    val lastModifiedDevice: String = "android",  // 'web' or 'android'
    val deviceVersion: Long = 1  // Sync tracking
)

@Entity(tableName = "document_versions")
data class DocumentVersion(
    @PrimaryKey val id: String,
    val documentId: String,
    val content: String,
    val version: Int,
    val createdBy: String,
    val createdAt: Long,
    val deviceSource: String = "android",  // 'web' or 'android'
    val deviceVersion: Long = 1  // Device version at time of save
)

@Entity(tableName = "shares")
data class Share(
    @PrimaryKey val id: String,
    val documentId: String,
    val sharedWithUserId: String,
    val permission: String, // "view", "edit"
    val createdAt: Long
)

@Entity(tableName = "ai_sessions")
data class AiSession(
    @PrimaryKey val id: String,
    val userId: String?,  // Nullable for offline-first mode
    val mode: String, // "inline" or "panel"
    val turnsJson: String, // JSON array serialization
    val metadata: String?, // JSON object
    val createdAt: Long
)

// Sync Phase 0 Tables (Device-aware sync)
@Entity(tableName = "sync_metadata")
data class SyncMetadata(
    @PrimaryKey val documentId: String,
    val lastSyncedAt: Long?,
    val localVersion: Long,
    val remoteVersion: Long,
    val pendingChanges: Int = 0,
    val conflictStatus: String = "none", // 'none', 'resolved', 'unresolved'
    val updatedAt: Long
)

@Entity(tableName = "pending_sync_queue")
data class PendingSyncItem(
    @PrimaryKey val id: String,
    val documentId: String,
    val userId: String?,  // Nullable for local changes
    val deviceId: String = "android",
    val changeDataJson: String,  // JSON payload
    val status: String = "pending",  // 'pending', 'failed', 'synced'
    val retryCount: Int = 0,
    val createdAt: Long,
    val updatedAt: Long
)

@Entity(tableName = "document_conflicts")
data class DocumentConflict(
    @PrimaryKey val id: String,
    val documentId: String,
    val baseVersionJson: String,  // Common ancestor
    val androidVersionJson: String,  // Local version
    val webVersionJson: String,  // Remote version
    val resolvedVersionJson: String?,  // Resolution result
    val status: String = "unresolved",  // 'unresolved', 'resolved'
    val createdAt: Long,
    val resolvedAt: Long?
)
```

### Sync Strategy
- **Offline-first with optional sync:** Full app functionality without authentication; users can work completely offline
- **Device-aware sync (Phase 0):** When logged in, syncs changes to web via `/api/documents/:id/sync` with device metadata
- **Online-first for shared docs:** When authenticated and online, pulls latest changes from server and other devices
- **Offline-first capability:** Room provides local cache, fully functional even without network or authentication
- **Conflict resolution:** Last-write-wins with device awareness; server `lastModifiedDevice` tracks source
- **Version tracking:** Monotonically increasing `deviceVersion` per device for conflict detection
- **Pending sync queue:** Changes queued locally when offline or unauthenticated, synced when both conditions met
- **Incremental sync:** Uses `since` parameter for bandwidth-efficient incremental pulls

---

## 4. API Layer Mapping (Phase A: Kotlin Core + Phase B: Android Integration)

### Web Endpoints (18 REST routes + Sync API)

The Kotlin app consumes existing Next.js API routes:

```
Auth (Optional):
  POST   /api/auth/register          → AuthRepository.register()
  POST   /api/auth/login             → AuthRepository.login()
  POST   /api/auth/logout            → AuthRepository.logout()
  GET    /api/auth/session           → AuthRepository.getSession()

Documents:
  GET    /api/documents              → DocumentRepository.getAllDocuments()
  GET    /api/documents/:id          → DocumentRepository.getDocument()
  POST   /api/documents              → DocumentRepository.createDocument()
  PUT    /api/documents/:id          → DocumentRepository.updateDocument()
  DELETE /api/documents/:id          → DocumentRepository.deleteDocument()

Sync API (Device-aware sync):
  GET    /api/documents/:id/sync     → SyncService.getSyncedDocument(since?: timestamp)
  PUT    /api/documents/:id/sync     → SyncService.pushChanges(content, deviceId, deviceVersion)
  POST   /api/documents/:id/versions → SyncService.getVersionHistory(since, limit)
  GET    /api/sync/status            → SyncService.getSyncStatus()

Folders:
  GET    /api/folders                → FolderRepository.getAllFolders()
  POST   /api/folders                → FolderRepository.createFolder()
  PUT    /api/folders/:id            → FolderRepository.updateFolder()
  DELETE /api/folders/:id            → FolderRepository.deleteFolder()

Sharing:
  POST   /api/shares                 → DocumentRepository.shareDocument()
  DELETE /api/shares/:id             → DocumentRepository.revokeShare()
  GET    /api/documents/:id/shares   → DocumentRepository.getShares()

AI:
  POST   /api/ai/inline              → AIRepository.executeInlineAI()
  POST   /api/ai/session             → AIRepository.startSession()
  POST   /api/ai/session/:id/turn    → AIRepository.addTurn()
```

### Kotlin Core: Ktor HTTP Client (Multiplatform)

The Kotlin Core library provides platform-agnostic HTTP client abstractions using Ktor Client:

```kotlin
// dictator-core/src/commonMain/kotlin/data/remote/api/DictatorApiClient.kt

class DictatorApiClient(
    private val httpClient: HttpClient,
    private val config: ApiConfig
) {
    // Auth endpoints
    suspend fun register(email: String, password: String): AuthResponse
    suspend fun login(email: String, password: String): AuthResponse
    suspend fun logout(): Result<Unit>
    
    // Document endpoints
    suspend fun getAllDocuments(): List<DocumentDto>
    suspend fun getDocument(id: String): DocumentDto
    suspend fun createDocument(request: CreateDocumentRequest): DocumentDto
    suspend fun updateDocument(id: String, request: UpdateDocumentRequest): DocumentDto
    suspend fun deleteDocument(id: String): Result<Unit>
    
    // Sync endpoints
    suspend fun syncDocument(id: String, since: Long?): SyncResponse
    suspend fun pushChanges(id: String, request: SyncRequest): SyncResponse
    
    // ... other endpoints
}

// Multiplatform dependencies in build.gradle.kts:
// - ktor-client-core
// - ktor-client-content-negotiation
// - ktor-serialization-kotlinx-json
// - ktor-client-logging
```

**Platform-specific implementations:**
- `androidMain/`: Uses `ktor-client-android`
- `desktopMain/`: Uses `ktor-client-java`
- `iosMain/`: Uses `ktor-client-ios`
- `jsMain/`: Uses `ktor-client-js` (for KMP web clients)

### Android Phase B: Retrofit (Deprecated, use Ktor Client)

**Note:** Phase B (Android UI) will use the Ktor HTTP client from Phase A (Kotlin Core). Retrofit is mentioned here for reference but should be avoided in favor of multiplatform Ktor Client.

If Retrofit is necessary for Android-specific reasons, it should wrap the Ktor client abstraction from core:

```kotlin
// dictator-android/src/main/kotlin/di/NetworkModule.kt
// (This should delegate to core's Ktor client instead)

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideDictatorApiClient(
        coreApiClient: DictatorApiClient  // Injected from core
    ): DictatorApiClient = coreApiClient
}

interface SyncService {
    @GET("documents/{id}/sync")
    suspend fun getSyncedDocument(
        @Path("id") documentId: String,
        @Query("since") since: String?
    ): SyncResponse
    
    @PUT("documents/{id}/sync")
    suspend fun pushChanges(
        @Path("id") documentId: String,
        @Body req: SyncRequest
    ): SyncResponse
    
    @POST("documents/{id}/versions")
    suspend fun getVersionHistory(
        @Path("id") documentId: String,
        @Body req: VersionHistoryRequest
    ): VersionHistoryResponse
    
    @GET("sync/status")
    suspend fun getSyncStatus(): SyncStatusResponse
}

interface AIService {
    @Streaming
    @POST("ai/inline")
    fun executeInlineAI(@Body req: AIRequest): Call<ResponseBody>
    // ... others
}
```

---

## 5. Voice System Implementation (Phase A: Core Logic + Phase B: Android Integration)

### 5.1 Web Implementation (Current)
```typescript
// Speech Recognition → parseTriggers() → punctuation.normalizePunctuation() → Editor state
- Listen for "@" trigger
- Parse command vs text
- Map punctuation words to symbols
```

### 5.2 Phase A: Kotlin Core - Voice Business Logic

The Kotlin Core library contains all voice processing logic (multiplatform):

```kotlin
// dictator-core/src/commonMain/kotlin/service/VoiceService.kt

interface VoiceRecognitionProvider {
    suspend fun startListening(): Flow<VoiceResult>
    suspend fun stopListening()
}

class VoiceService(
    private val recognitionProvider: VoiceRecognitionProvider,
    private val documentRepository: DocumentRepository
) {
    // Core business logic - platform-agnostic
    fun parseVoiceInput(text: String): List<VoiceSegment> {
        return parseTriggers(text)  // "@" command parsing
    }
    
    fun normalizePunctuation(text: String): String {
        var result = text
        PunctuationMap.forEach { (pattern, replacement) ->
            result = result.replace(pattern, replacement)
        }
        return result
    }
    
    suspend fun processVoiceCommand(command: String, documentId: String) {
        val segments = parseVoiceInput(command)
        for (segment in segments) {
            when (segment) {
                is TextSegment -> {
                    val normalized = normalizePunctuation(segment.text)
                    documentRepository.appendToDocument(documentId, normalized)
                }
                is CommandSegment -> executeCommand(segment.command, documentId)
            }
        }
    }
}

// Punctuation mappings (direct port from web)
val PunctuationMap = mapOf(
    Regex("\\bperiod\\b", RegexOption.IGNORE_CASE) to ".",
    Regex("\\bcomma\\b", RegexOption.IGNORE_CASE) to ",",
    Regex("\\bquestion mark\\b", RegexOption.IGNORE_CASE) to "?",
    Regex("\\bexclamation mark\\b", RegexOption.IGNORE_CASE) to "!",
    Regex("\\belipsis\\b", RegexOption.IGNORE_CASE) to "...",
    Regex("\\bnew line\\b", RegexOption.IGNORE_CASE) to "\n",
    Regex("\\bnew paragraph\\b", RegexOption.IGNORE_CASE) to "\n\n",
)
```

**expect/actual declarations for platform-specific audio capture:**

```kotlin
// dictator-core/src/commonMain/kotlin/service/VoiceRecognitionProvider.kt
expect interface VoiceRecognitionProvider

// dictator-core/src/androidMain/kotlin/service/VoiceRecognitionProvider.kt
actual interface VoiceRecognitionProvider {
    // Android-specific SpeechRecognizer implementation goes here
}

// dictator-core/src/desktopMain/kotlin/service/VoiceRecognitionProvider.kt
actual interface VoiceRecognitionProvider {
    // Desktop voice API implementation goes here
}
```

### 5.3 Phase B: Android Implementation

**Android-specific SpeechRecognizer Integration:**

```kotlin
// dictator-android/src/main/kotlin/service/AndroidVoiceRecognitionProvider.kt

@HiltViewModel
class VoiceRecognitionViewModel(
    private val voiceService: VoiceService  // Injected from core
) : ViewModel() {
    private val speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
    
    fun startListening() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
        }
        speechRecognizer.startListening(intent)
    }
    
    private val recognitionListener = object : RecognitionListener {
        override fun onResults(results: Bundle?) {
            val voiceText = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
            viewModelScope.launch {
                voiceService.processVoiceCommand(voiceText, currentDocumentId)
            }
        }
        // ... other listener methods
    }
}
```

**Jetpack Compose UI for voice input:**

```kotlin
// dictator-android/src/main/kotlin/ui/component/VoicePanel.kt

@Composable
fun VoicePanel(viewModel: VoiceRecognitionViewModel) {
    val isListening by viewModel.isListening.collectAsState()
    
    FloatingActionButton(onClick = { viewModel.startListening() }) {
        Icon(
            imageVector = if (isListening) Icons.Filled.Mic else Icons.Filled.MicNone,
            contentDescription = "Voice Input"
        )
    }
}
```

### 5.4 Phase C: KMP/Desktop Voice Integration

For Desktop (Compose Multiplatform), the core VoiceService remains the same, but platform-specific implementations are provided:

```kotlin
// dictator-kmp/shared/src/desktopMain/kotlin/service/DesktopVoiceRecognitionProvider.kt

actual class VoiceRecognitionProvider {
    // Use OS-native voice API (NSAudioSession for macOS, Windows Audio APIs, PulseAudio for Linux)
    // Or integrate with cloud-based speech-to-text (Google Cloud Speech, Azure Speech)
}
```

This maintains code reuse across platforms while allowing platform-specific optimizations.

### 5.5 Option B: Cloud-Based Speech-to-Text (Advanced)
- Requires API key and costs per request
- Streaming recognition capability
- Use with gRPC or REST client

---

## 6. UI/UX Layer (Phase B: Android-Specific - Jetpack Compose)

### 6.1 Key Screen Structure

| Web Component | Android Screen | Compose Implementation |
|--------------|----------------|-----------------------|
| LoginForm | AuthScreen | Column layout with TextField, Button |
| DashboardLayout | MainScreen | Bottom navigation + nested nav |
| DocumentList | DocumentsListScreen | LazyColumn of document items |
| DocumentEditor | EditorScreen | Rich text editor + Tiptap-equivalent |
| VoiceDock | VoicePanel | Floating action button + overlay |
| AIPanel (sidebar) | AiPanelSheet | BottomSheetScaffold or NavigationDrawer |

### 6.2 Compose Best Practices for Dictator

```kotlin
// Screen-level state management
@HiltViewModel
class EditorViewModel(
    private val docRepo: DocumentRepository,
    private val aiService: AIService
) : ViewModel() {
    private val _editorState = MutableStateFlow<EditorState>(EditorState.Loading)
    val editorState: StateFlow<EditorState> = _editorState.asStateFlow()
    
    fun insertText(text: String) {
        viewModelScope.launch {
            // Update state, which triggers Compose recomposition
        }
    }
}

// Composable functions following single-responsibility
@Composable
fun EditorScreen(viewModel: EditorViewModel = hiltViewModel()) {
    val state by viewModel.editorState.collectAsState()
    when (state) {
        EditorState.Loading -> LoadingScreen()
        is EditorState.Success -> EditorContent(state.document)
        is EditorState.Error -> ErrorScreen(state.message)
    }
}
```

---

## 7. Android-Specific Considerations

### 7.1 Permissions Required

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" /> <!-- Voice input -->
<uses-permission android:name="android.permission.CAMERA" /> <!-- QR code scan for share links -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" /> <!-- Document export -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### 7.2 Lifecycle Management

```kotlin
// Compose Activities use Lifecycle.repeatOnLifecycle patterns
LaunchedEffect(Unit) {
    lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.editorState.collect { state ->
            // Update UI only when activity is STARTED or RESUMED
        }
    }
}
```

### 7.3 Offline Functionality (Optional Sync with New Sync API)

- **Local-first approach:** Room DB provides complete document cache, fully functional offline
- **Optional sync:** Sync only requires login; app works without authentication for local documents
- **Device-aware sync:** Tracks which device (web vs Android) last modified documents
- **Sync manager:** Background WorkManager job syncs when network and auth available
- **Pending queue:** Changes queued locally when offline, automatically synced when online
- **Conflict resolution:** Last-write-wins strategy with device awareness; conflicts stored in `document_conflicts` table
- **Version tracking:** Monotonically increasing `deviceVersion` per device for merge tracking
- **Incremental sync:** `/api/documents/:id/sync?since=timestamp` for bandwidth efficiency
- **Voice input:** Fully functional offline; queued for sync when online and authenticated

### 7.4 Security Best Practices

```kotlin
// 1. JWT Storage in Android Keystore
val spec = KeyGenParameterSpec.Builder(
    "jwt_key",
    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
).build()
val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES)
keyGenerator.init(spec)

val encryptedSharedPreferences = EncryptedSharedPreferences.create(
    context,
    "encrypted_prefs",
    MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)

// 2. Biometric Authentication (Phase 11)
val prompt = BiometricPrompt(
    activity,
    Executors.newSingleThreadExecutor(),
    object : BiometricPrompt.AuthenticationCallback() { /*...*/ }
)
prompt.authenticate(BiometricPrompt.PromptInfo.Builder()
    .setTitle("Unlock Dictator")
    .setNegativeButtonText("Cancel")
    .build()
)
```

### 7.5 Testing Strategy

**Unit Tests (80% coverage target)**
```kotlin
// Use MockK for mocking
// Test repositories, ViewModels, use cases independently
@Test
fun parseVoiceCommand_withTrigger_parsesCorrectly() {
    val input = "Hey, create @ new document"
    val result = VoiceService.parseTriggers(input)
    assertThat(result).isEqualTo(listOf(TextSegment("Hey, create "), CommandSegment("new document")))
}
```

**Integration Tests (with Room + test doubles)**
```kotlin
// Use @SmallTest for Room tests
@SmallTest
@RunWith(AndroidJUnit4::class)
class DocumentRepositoryTest {
    @get:Rule val instantExecutorRule = InstantTaskExecutorRule()
    private lateinit var db: TestDatabase
    
    @Test
    fun insertDocument_retrievesCorrectly() { /*...*/ }
}
```

**UI Tests (Jetpack Compose)**
```kotlin
@RunWith(AndroidJUnit4::class)
class EditorScreenTest {
    @get:Rule val composeTestRule = createComposeRule()
    
    @Test
    fun editorDisplaysContent() {
        composeTestRule.setContent {
            EditorScreen(viewModel = FakeEditorViewModel())
        }
        composeTestRule.onNodeWithText("Document Title").assertIsDisplayed()
    }
}
```

---

## 8. Development Timeline & Milestones (Phased Approach)

### Phase A: Kotlin Core Library (Weeks 1-6)

| Week | Milestones | Tasks |
|------|-----------|-------|
| 1 | Core Project Setup | Gradle multimodule, SQLDelight schema, Koin DI setup, Ktor client configuration |
| 2 | Domain Entities | Define User, Document, Folder, AISession, Share entities; create SQLDelight migrations |
| 3 | Repository Layer | Implement local data sources (DAO), repository interfaces and implementations |
| 4 | Remote Data Source | Implement Ktor API client, error handling, authentication interceptor |
| 5 | Service Layer | Implement VoiceService, AIService, SyncService, AuthService, DocumentService |
| 6 | Core Testing | 80%+ unit test coverage for core logic, utility functions, validation |

**Deliverable:** `dictator-core` library published to Maven repo, all core logic tested and documented

---

### Phase B: Android UI Layer (Weeks 7-14) - Depends on Phase A

| Week | Milestones | Tasks |
|------|-----------|-------|
| 7 | Android Project Setup | Android module, Jetpack Compose scaffold, Hilt DI, dependency on `:core` |
| 8-9 | Authentication UI | LoginScreen, SignupScreen, AuthViewModel; integrate core AuthService |
| 10 | Document Management | DocumentListScreen, EditorScreen, FolderBrowserScreen with core DocumentService |
| 11 | Voice Integration | VoicePanel component, integrate core VoiceService with SpeechRecognizer API |
| 12 | AI Integration | AIPanel component, integrate core AIService with Claude API |
| 13 | Sync & Sharing | SyncStatusScreen, ShareDialog, conflict resolution UI |
| 14 | Polish & Deploy | UI/UX refinement, Play Store assets, testing, release build signing |

**Deliverable:** Android app in Play Store, full feature parity with web version

---

### Phase C: Kotlin Multiplatform (Weeks 15+) - Optional, Depends on Phase A

#### Phase C.1: KMP Core Migration (Weeks 15-17)
- Migrate Phase A core to KMP-compatible structure
- Convert SQLDelight for multiplatform support
- Add `expect/actual` declarations for platform-specific APIs
- Test on JVM, Android, Desktop targets

**Deliverable:** `:kmp-core` library compiling for multiple targets

#### Phase C.2: Compose Multiplatform UI (Weeks 18-20)
- Extract Android UI code to shared `commonMain` source set
- Create platform-specific overrides in `androidMain`, `desktopMain`, `iosMain`
- Share theme and design system across platforms
- Test UI on Android and Desktop

**Deliverable:** Shared UI library with 60-80% code reuse

#### Phase C.3: Desktop Application (Weeks 20+)
- Build desktop entry point using Compose Desktop
- Add platform-native file dialogs, clipboard, notifications
- Create installers (MSI, DMG, AppImage)
- Implement auto-update mechanism

**Deliverable:** Standalone desktop app for Windows, macOS, Linux

#### Phase C.4: iOS Application (Weeks 25+) - Optional
- Leverage KMP core for business logic
- Build SwiftUI UI on top of Kotlin/Native
- Or use Compose Multiplatform if stable on iOS

**Deliverable:** iOS app in App Store (optional, depends on market demands)

---

### Original Android-Only Timeline (if skipping Core Modularity)

If proceeding with Android-only approach without core modularity:

| Week(s) | Milestones | Tasks |
|---------|-----------|-------|
| 1-2 | Project Setup | Set up Kotlin project, Compose scaffold, Hilt DI, Room DB with sync tables |
| 3 | Auth MVP (Optional) | Login/signup screens, JWT token handling, session persistence; app usable without auth |
| 4 | Documents & Folders | Room schema, repository layer, list/create/delete functionality (local and synced) |
| 5 | Rich Text Editor | Implement editor component (Compose or WebView hybrid) |
| 6 | Sync API MVP | Integrate `/api/documents/:id/sync` endpoint, pending queue, version tracking |
| 7 | Voice Input Phase 1 | SpeechRecognizer integration, basic command parsing |
| 8 | Voice Input Phase 2 | Punctuation normalization, continuous listening |
| 9 | AI Integration MVP | Claude API integration (requires auth), inline AI execution, streaming |
| 10 | AI Panel Mode | Session persistence, conversation history UI |
| 11 | Sharing & Collab | Share links, permission model, QR code display |
| 12 | Conflict Resolution | Handle sync conflicts, pending queue retry logic, conflict UI |
| 13 | Testing & Polish | Full test suite, UI polish, performance optimization |
| 14 | Deployment | Play Store submission, release APK signing, documentation |

---

## 9. Phase A: Kotlin Core Dependencies & Libraries

### Phase A (Core Library) - Multiplatform-Compatible

```kotlin
// dictator-core/build.gradle.kts

plugins {
    kotlin("multiplatform")
    kotlin("plugin.serialization")
    id("app.cash.sqldelight")
}

kotlin {
    jvm()
    androidTarget()
    // iosX64() // Phase C
    // iosArm64() // Phase C
    // iosSimulatorArm64() // Phase C
    // js(IR) { browser() } // Phase C
    
    sourceSets {
        commonMain {
            dependencies {
                // Kotlin & Coroutines (multiplatform)
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.1")
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
                
                // Networking
                implementation("io.ktor:ktor-client-core:2.3.0")
                implementation("io.ktor:ktor-client-content-negotiation:2.3.0")
                implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.0")
                implementation("io.ktor:ktor-client-logging:2.3.0")
                
                // Database
                implementation("app.cash.sqldelight:runtime:2.0.0")
                
                // Dependency Injection
                implementation("io.insert-koin:koin-core:3.4.0")
                
                // Utilities
                implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.4.0")
                implementation("com.benasher44:uuid:0.8.0")
                
                // Logging
                implementation("co.touchlab:kermit:0.9.0")
            }
        }
        
        androidMain {
            dependencies {
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.1")
                implementation("io.ktor:ktor-client-android:2.3.0")
                implementation("app.cash.sqldelight:driver-android:2.0.0")
            }
        }
        
        commonTest {
            dependencies {
                implementation("kotlin-test")
                implementation("io.mockk:mockk:1.13.7")
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.1")
            }
        }
    }
}
```

**Key multiplatform libraries for Phase A:**
- `kotlinx-coroutines-core` - Async/await across platforms
- `ktor-client-core` - Multiplatform HTTP client
- `sqldelight` - Multiplatform database with SQLite
- `koin-core` - DI framework with KMP support
- `kotlinx-serialization` - JSON serialization (multiplatform)
- `kermit` - Logging (multiplatform)

---

## 9.B Phase B: Android UI Dependencies

### Phase B (Android App) - Android-Specific

```kotlin
// dictator-android/build.gradle.kts

plugins {
    id("com.android.application")
    kotlin("android")
    kotlin("kapt")
    id("com.google.dagger.hilt.android")
}

android {
    // ... standard Android config
}

dependencies {
    // Core library (Phase A)
    implementation(project(":dictator-core"))
    
    // Jetpack & AndroidX
    implementation("androidx.compose.ui:ui:1.6.0")
    implementation("androidx.compose.material3:material3:1.1.0")
    implementation("androidx.compose.foundation:foundation:1.6.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.6.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.1")
    implementation("androidx.navigation:navigation-compose:2.7.0")
    
    // Hilt DI
    implementation("com.google.dagger:hilt-android:2.47")
    kapt("com.google.dagger:hilt-compiler:2.47")
    implementation("androidx.hilt:hilt-navigation-compose:1.1.0")
    
    // Database (Android-specific, wraps core SQLDelight)
    implementation("androidx.room:room-runtime:2.5.2")
    kapt("androidx.room:room-compiler:2.5.2")
    
    // Security
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    implementation("androidx.biometric:biometric:1.1.0")
    
    // Rich Text (TBD)
    implementation("androidx.compose.material:material-icons-extended:1.6.0")
    
    // Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("io.mockk:mockk:1.13.7")
    androidTestImplementation("androidx.test:runner:1.5.2")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4:1.6.0")
}
```

### Android Version Compatibility
- **Min SDK:** 28 (Android 9.0 Pie) - covers 99%+ of devices
- **Target SDK:** 34 (Android 14) - latest as of 2024
- **Kotlin:** 1.9+
- **Compose:** 1.6.0+

---

## 9.C Phase C: KMP & Desktop Dependencies (Future)

```kotlin
// dictator-kmp/shared/build.gradle.kts (Phase C)

plugins {
    kotlin("multiplatform")
    id("org.jetbrains.compose")
}

kotlin {
    jvm()
    androidTarget()
    iosX64()
    iosArm64()
    iosSimulatorArm64()
    
    sourceSets {
        commonMain {
            dependencies {
                // All Phase A core dependencies (already imported)
                implementation(project(":dictator-core"))
                
                // Compose Multiplatform
                implementation(compose.runtime)
                implementation(compose.foundation)
                implementation(compose.material3)
                implementation(compose.ui)
                implementation(compose.animation)
                
                // Navigation (multiplatform)
                implementation("org.jetbrains.androidx.navigation:navigation-compose:2.7.0-alpha05")
            }
        }
        
        desktopMain {
            dependencies {
                implementation(compose.desktop.currentOs)
                implementation("io.ktor:ktor-client-java:2.3.0")
            }
        }
        
        iosMain {
            dependencies {
                implementation("io.ktor:ktor-client-ios:2.3.0")
                implementation("app.cash.sqldelight:driver-native:2.0.0")
            }
        }
    }
}
```

**Key dependencies for Phase C:**
- `jetbrains/compose` - Compose Multiplatform UI framework
- `ktor-client-java` - Desktop HTTP client
- `ktor-client-ios` - iOS HTTP client
- `sqldelight-native-driver` - iOS database support

---

## 10. Rich Text Editor Decision (Phase A & B)

### Challenge
No perfect Compose-native equivalent to Tiptap exists. Options:

#### Option A: Hybrid WebView (Quickest)
```kotlin
AndroidView(modifier = Modifier.fillMaxSize()) { context ->
    WebView(context).apply {
        loadUrl("file:///android_asset/tiptap-editor.html")
        addJavascriptInterface(EditorBridge(), "editor")
    }
}

// Bridge between Compose and WebView JavaScript
class EditorBridge {
    @JavascriptInterface
    fun getContent(): String = viewModel.editorState.value.content
    
    @JavascriptInterface
    fun insertText(text: String) {
        viewModel.insertText(text)
    }
}
```
- **Pros:** Reuses web Tiptap, fastest development
- **Cons:** Performance overhead, separate WebView lifecycle management

#### Option B: Compose RichTextEditor Library
```kotlin
// Use androidx.compose.material:rich-text (hypothetical)
// or build custom using basic TextField + styling logic
RichTextEditor(
    value = editorState.value,
    onValueChange = { viewModel.updateContent(it) },
    modifier = Modifier.fillMaxSize()
)
```
- **Pros:** Native performance, consistent Compose patterns
- **Cons:** May require custom implementation of formatting

#### Recommendation
**Start with Option A (WebView bridge)** for MVP speed, migrate to Option B post-MVP if performance issues arise.

---

## 11. Testing Strategy (Phase A, B, C)

### Phase A: Kotlin Core - Unit Testing (70% of effort)

```kotlin
// Test structure for Phase A core library

testImplementation("io.mockk:mockk:1.13.7")
testImplementation("kotlin-test")
testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.1")

// Example core unit test
class VoiceServiceTest {
    @Test
    fun testParseVoiceInput_withTrigger() {
        val service = VoiceService(mockProvider, mockRepository)
        val result = service.parseVoiceInput("Hey, create @ new document")
        assertEquals(2, result.size)
        assertTrue(result[0] is TextSegment)
        assertTrue(result[1] is CommandSegment)
    }
    
    @Test
    fun testNormalizePunctuation() {
        val service = VoiceService(mockProvider, mockRepository)
        val result = service.normalizePunctuation("I said hello period")
        assertEquals("I said hello.", result)
    }
}

// Repository layer tests
class DocumentRepositoryTest {
    @Test
    fun testSyncDocument_withConflict() {
        // Test sync logic with device-aware conflict resolution
    }
}
```

**Target:** 80%+ coverage for Phase A core logic

### Phase B: Android - Integration & UI Testing (20% of effort)

```kotlin
// Instrumented tests for Android UI

androidTestImplementation("androidx.test:runner:1.5.2")
androidTestImplementation("androidx.compose.ui:ui-test-junit4:1.6.0")

@RunWith(AndroidJUnit4::class)
class EditorScreenTest {
    @get:Rule val composeTestRule = createComposeRule()
    
    @Test
    fun testEditorDisplaysDocument() {
        val fakeViewModel = FakeEditorViewModel()
        composeTestRule.setContent {
            EditorScreen(viewModel = fakeViewModel)
        }
        composeTestRule.onNodeWithText("Document Title").assertIsDisplayed()
    }
}

@RunWith(AndroidJUnit4::class)
class VoicePanelTest {
    @get:Rule val composeTestRule = createComposeRule()
    
    @Test
    fun testVoicePanelToggle() {
        // Test voice panel interactions
    }
}
```

**Target:** 80%+ coverage for Phase B UI logic + Android-specific services

### Phase C: KMP - Cross-Platform Testing (Future)

For KMP builds, testing strategy extends to multiple platforms:
- Unit tests run on JVM, Android, iOS (native compilation)
- Compose UI tests run on Desktop and Android
- Platform-specific tests for OS APIs (voice recognition, file dialogs, etc.)

### Test Pyramid Summary
```
         [UI Tests - 10%]              (Android Compose, Desktop Compose MP)
    [Integration Tests - 20%]      (DB + API mocking, sync logic)
   [Unit Tests - 70%]              (Core logic, services, repositories)
```

---

## 12. Deployment Strategy (Phase-Specific)

### Phase A: Kotlin Core Library Deployment
1. **Publishing:** Publish to Maven Central or internal Maven repository
2. **Documentation:** API documentation via Dokka
3. **Version Strategy:** Semantic versioning (v1.0.0, v1.1.0, v2.0.0)
4. **CI/CD:** GitHub Actions tests on JVM, Android targets

```yaml
name: Core Library CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
      - run: ./gradlew :dictator-core:build
      - run: ./gradlew :dictator-core:test
      - run: ./gradlew :dictator-core:publish  # Publish to Maven repo
```

### Phase B: Android App - Play Store Submission
1. **Signing:** Create Android App Signing certificate (kept in Google Play Console)
2. **Release Build:** Generate signed AAB (Android App Bundle) with keystore
3. **Version Tracking:** Use same version scheme as web (vX.Y.Z)
4. **Store Listing:** Screenshots, description, privacy policy link, accessibility statement
5. **Staged Rollout:** 1% → 5% → 10% → 100% over 2 weeks
6. **Monitoring:** Crash reporting via Firebase Crashlytics

```yaml
name: Android CI/CD
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
      - run: ./gradlew :dictator-android:build
      - run: ./gradlew :dictator-android:test
      - run: ./gradlew :dictator-android:connectedAndroidTest
      - run: ./gradlew :dictator-android:bundleRelease  # Generate Play Store AAB
      - name: Upload to Play Store (Internal Testing)
        run: fastlane supply --aab build/outputs/bundle/release/*.aab --track internal --json_key_data ${{ secrets.PLAY_STORE_JSON }}
```

### Phase C: Desktop & Multi-Platform Deployment (Future)
1. **Desktop Builds:** CI/CD generates MSI (Windows), DMG (macOS), AppImage (Linux)
2. **Code Signing:** Sign executables with company certificate
3. **Distribution:** GitHub Releases, website download page, auto-update via Sparkle/WinSparkle
4. **Package Managers:** Distribute via Homebrew, Chocolatey, Flathub

```yaml
name: Desktop CI/CD
on: [push, pull_request]
jobs:
  build-desktop:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
      - run: ./gradlew :dictator-desktop:build
      - run: ./gradlew :dictator-desktop:packageRelease
      - name: Upload Artifacts
        uses: actions/upload-artifact@v3
```

---

## 13. Success Criteria & Rollout Checklist (By Phase)

### Phase A: Kotlin Core Completion Criteria
- [ ] All domain entities defined (Document, User, Folder, AISession, Share, etc.)
- [ ] All repositories implemented with local + remote data sources
- [ ] All services implemented (VoiceService, AIService, SyncService, AuthService, DocumentService)
- [ ] 80%+ unit test coverage for core logic
- [ ] Voice parsing and punctuation normalization working correctly
- [ ] Sync business logic (conflict resolution, version tracking) tested
- [ ] Core library compiles and publishes to Maven repo
- [ ] API documentation complete

### Phase B: Android MVP Completion Criteria
- [ ] All 11 feature phases from web spec ported to Android UI
- [ ] 80%+ test coverage (70% unit + 10% instrumented)
- [ ] Offline-first capability with full local document functionality (login optional)
- [ ] Device-aware sync with pending queue and conflict tracking (when authenticated)
- [ ] Voice input with punctuation normalization
- [ ] Claude AI integration working (requires authentication)
- [ ] Play Store alpha release (internal testing track)
- [ ] Performance: Load documents <2s, voice recognition <1s latency
- [ ] Optional authentication: App fully usable without login for local documents
- [ ] Accessibility: TalkBack support, proper content descriptions, color contrast

### Phase B: Post-MVP (Extended)
- [ ] Real-time collaborative editing
- [ ] Biometric authentication
- [ ] Document export to PDF
- [ ] AI suggestions and advanced modes
- [ ] Offline drafts with conflict resolution UI
- [ ] Play Store public release (phased rollout)

### Phase C: KMP & Desktop Completion Criteria (Future)
- [ ] Kotlin Core successfully compiles for all KMP targets (JVM, Android, iOS)
- [ ] Compose Multiplatform UI 60-80% code reuse across platforms
- [ ] Desktop app builds and runs on Windows, macOS, Linux
- [ ] All core features available on desktop
- [ ] Desktop app auto-update mechanism working
- [ ] iOS app optional: Core logic ported to iOS via Kotlin/Native + SwiftUI

---

## 14. Open Questions & Decisions Needed

### Phase A (Kotlin Core)
1. **Multiplatform Strategy:** Start with JVM/Android, plan KMP migration for Phase C later?
2. **Database:** SQLDelight vs. Exposed for multiplatform support?
3. **HTTP Client:** Ktor Client (multiplatform) vs. platform-specific clients?
4. **Dependency Injection:** Koin vs. other KMP-compatible DI frameworks?

### Phase B (Android)
1. **Rich Text Editor:** WebView bridge (fast) vs. Compose custom (performant)?
2. **Voice Recognition:** Android SpeechRecognizer (free) or Google Cloud Speech (better accuracy)?
3. **Target Device Types:** Phones only, tablets, foldables?
4. **Optional Auth Scope:** Should offline documents be synced when user logs in, or kept separate?

### Phase C (KMP & Desktop)
1. **KMP Adoption Timeline:** After Phase B MVP, or in parallel with Phase B?
2. **Desktop Platform Priority:** Windows, macOS, Linux simultaneously or staggered?
3. **iOS Compatibility:** iOS support via Kotlin/Native + SwiftUI or wait for future?
4. **Real-time Collaboration:** Firebase Realtime DB, Socket.IO, or simple polling for all platforms?

---

## 15. Resource Requirements (Phased)

### Phase A: Kotlin Core Library
- **Team Size:** 1-2 Kotlin engineers (full-time, 6 weeks)
- **Infrastructure:**
  - Kotlin development environment (IntelliJ IDEA)
  - GitHub repository
  - Maven repository (internal or Central)
  - CI/CD: GitHub Actions (free)
  
### Phase B: Android Development
- **Team Size:** 2-3 Android engineers (full-time, 8 weeks)
- **QA:** 1 QA engineer (part-time, weeks 7-14)
- **Infrastructure:**
  - Android Studio IDE
  - Android Emulators + physical test devices (various API levels)
  - Firebase (optional): Crashlytics, Analytics
  - Play Store Developer Account ($25 one-time)
  - GitHub Actions CI/CD (free tier)

### Phase C: KMP & Desktop (Future)
- **Team Size:** 2-4 Kotlin/Desktop engineers (depends on platform priority)
- **Infrastructure:**
  - IntelliJ IDEA + Compose Multiplatform plugin
  - Desktop development environments (JVM, native toolchains)
  - Code signing certificates (Apple Developer, Windows Codesigning)
  - Distribution infrastructure (GitHub Releases, website, auto-update servers)
  - macOS/Windows/Linux build machines for CI/CD

---

## 16. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Phase A delays block Phase B | Medium | High | Start Phase A, plan Phase B in parallel; modularize early |
| KMP multiplatform complexity | Medium | High | Evaluate KMP feasibility mid-Phase A; alternative: Android-only if needed |
| Rich text editor performance | Medium | High | Start with WebView MVP (Phase B week 5), benchmark vs. Compose impl. |
| Voice recognition accuracy | Medium | Medium | Provide manual text entry fallback; test across device types |
| Real-time sync conflicts | Low | High | Implement last-write-wins (Phase B week 13); plan 3-way merge for Phase C |
| Platform-specific code leakage into core | Medium | Medium | Enforce strict `commonMain`/`*Main` separation; code review checklist |
| KMP adoption curve | Medium | Medium | Documentation, examples, training; start with smaller features |
| Play Store approval delays | Low | Medium | Submit early, document accessibility features, follow guidelines |
| API rate limiting scalability | Low | Medium | Monitor usage; plan Redis integration if needed; add rate limit headers |

---

## Conclusion

The **modular Kotlin approach** to Dictator provides a scalable path from Android MVP to multi-platform support:

### Phase A: Kotlin Core (6 weeks)
Builds a platform-agnostic, testable core library with 80%+ test coverage. This foundation enables:
- Rapid Android UI development (Phase B)
- Future KMP/Desktop expansion (Phase C)
- Easy maintenance and feature addition across platforms

### Phase B: Android MVP (8 weeks)
Delivers a feature-complete Android app with:
- Full offline-first capability (login optional)
- Device-aware sync with conflict resolution
- Voice input, AI integration, rich document editing
- Play Store release with phased rollout

### Phase C: KMP & Desktop (10+ weeks, Future)
Extends the core to:
- Windows, macOS, Linux desktop clients via Compose Multiplatform
- iOS support via Kotlin/Native (optional)
- 60-80% UI code reuse across platforms
- Single codebase for business logic

### Why This Architecture?

1. **Separation of Concerns:** Core logic independent of UI frameworks
2. **Code Reuse:** Single implementation of voice, AI, sync logic
3. **Testability:** 70% of tests in platform-agnostic core
4. **Flexibility:** Add platforms (KMP, iOS, Web) without rewriting core
5. **Maintenance:** Bug fixes in core benefit all platforms automatically
6. **Team Scaling:** Parallel work on core + Android + desktop
7. **Future-Proof:** Ready for Kotlin Multiplatform ecosystem evolution

### Comparison: Monolithic vs. Modular Approach

**Monolithic Android-Only (Old Plan):** 14 weeks, Android only, future porting difficult
**Modular Kotlin Core + Android (New Plan):** 14 weeks total, but core + Android reusable for desktop/iOS

### Next Steps (Immediate Action Items)

1. **Approve phased approach** and confirm resource commitment (Phase A: 1-2 engineers, 6 weeks)
2. **Finalize tech stack decisions:**
   - Confirm SQLDelight vs. alternatives for multiplatform DB
   - Choose Koin or alternative KMP-compatible DI
   - Decide on Ktor Client for multiplatform HTTP
3. **Set up Phase A project structure:**
   - Create `:dictator-core` Gradle module
   - Configure KMP targets (jvm, androidTarget initially)
   - Set up SQLDelight schema migration system
   - Establish Koin DI configuration
4. **Begin Phase A Week 1:**
   - Implement domain entities (User, Document, Folder, AISession, Share)
   - Create SQLDelight schema migrations
   - Set up CI/CD for core library builds
5. **Plan Phase B kickoff** (after Phase A week 2-3 deliverables):
   - Create `:dictator-android` module depending on `:dictator-core`
   - Set up Jetpack Compose scaffold, Hilt DI
   - Begin Android project setup in parallel with Phase A completion

