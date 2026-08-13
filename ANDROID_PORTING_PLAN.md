# Dictator Android/Kotlin Port - Development Plan

## Executive Summary

This document outlines a comprehensive plan to port the Dictator application from TypeScript/Next.js web to a native Android application using Kotlin and Jetpack Compose. Dictator is a voice-to-text rich document editor with AI capabilities, designed for accessibility-first document creation.

**Current Status:** The web version (TypeScript/Next.js) is feature-complete with 11 fully implemented development phases.

**Target Platform:** Android (API 28+), with primary support for modern Android versions (API 31+).

**Estimated Timeline:** 8-12 weeks for MVP, 14-18 weeks for full feature parity.

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

### 1.2 Proposed Android Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Language** | Kotlin | Official Android language with interoperability with Java ecosystem |
| **UI Framework** | Jetpack Compose | Modern declarative UI (parallels React paradigm), better accessibility |
| **Database** | Room + SQLite | Standard Android local persistence, Drizzle model can map to Room entities |
| **Networking** | Retrofit 2 + OkHttp 4 | Type-safe REST client, mirrors backend API structure |
| **Authentication** | OAuth 2.0 + JWT (stored in Keystore) | Similar to web Auth.js, leveraging Android secure storage |
| **Rich Text Editor** | Slate-Android or custom Compose implementation | No perfect match; may need hybrid approach or custom implementation |
| **Voice Recognition** | SpeechRecognizer API or Google Generative AI Speech-to-Text | Platform-native or cloud-based alternative |
| **Async Operations** | Coroutines + Flow | Kotlin standard for async/reactive programming |
| **Dependency Injection** | Hilt | Modern DI framework for Android, works seamlessly with Compose |
| **State Management** | ViewModel + StateFlow | Compose-native pattern, lifecycle-aware |
| **Logging** | Timber | Android standard logging with production support |
| **AI Integration** | Anthropic Kotlin SDK (via Retrofit) | Same Claude Sonnet API, custom wrapper |

### 1.3 Architecture Layers

```
┌─────────────────────────────────────────────────┐
│         Presentation Layer (Compose)             │
│  ┌─────────────────────────────────────────────┐ │
│  │ Activities/Screens  │  UI Components         │ │
│  └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│       Domain Layer (Use Cases/Repositories)      │
│  ┌─────────────────────────────────────────────┐ │
│  │ UserRepository  │ DocumentRepository        │ │
│  │ VoiceService    │ AIService                 │ │
│  └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│        Data Layer (Local & Remote)               │
│  ┌───────────────┬──────────────────────────┐   │
│  │  Room DB      │  Retrofit API Client     │   │
│  │  (SQLite)     │  (REST endpoints)        │   │
│  └───────────────┴──────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

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

## 3. Data Model Mapping

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

### Android Room Schema (SQLite)

```kotlin
@Entity(tableName = "users")
data class User(
    @PrimaryKey val id: String,
    val email: String,
    val name: String?,
    val createdAt: Long
)

@Entity(tableName = "folders")
data class Folder(
    @PrimaryKey val id: String,
    val name: String,
    val userId: String,
    val parentId: String?,
    val createdAt: Long,
    @ForeignKey(entity = User::class) val userId: String
)

@Entity(tableName = "documents")
data class Document(
    @PrimaryKey val id: String,
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

## 4. API Layer Mapping

### Web Endpoints (18 REST routes + Sync API)

The Android app will consume existing Next.js API routes:

```
Auth (Optional):
  POST   /api/auth/register          → RetrofitAuthService.register()
  POST   /api/auth/login             → RetrofitAuthService.login()
  POST   /api/auth/logout            → RetrofitAuthService.logout()
  GET    /api/auth/session           → RetrofitAuthService.getSession()

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

### Android Retrofit Services

```kotlin
interface AuthService {
    @POST("auth/register")
    suspend fun register(@Body req: RegisterRequest): Response<AuthResponse>
    // ... others
}

interface DocumentService {
    @GET("documents")
    suspend fun getAllDocuments(): List<DocumentDto>
    // ... others
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

## 5. Voice System Implementation

### 5.1 Web Implementation (Current)
```typescript
// Speech Recognition → parseTriggers() → punctuation.normalizePunctuation() → Editor state
- Listen for "@" trigger
- Parse command vs text
- Map punctuation words to symbols
```

### 5.2 Android Implementation

**Option A: Native SpeechRecognizer (Recommended)**
```kotlin
// Android SpeechRecognizer → Voice Service → VoiceViewModel → UI
class VoiceService {
    fun startListening() {
        recognizer.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
        })
    }
    
    fun processResult(results: Bundle) {
        val voiceText = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.get(0)
        val segments = parseTriggers(voiceText) // Port of web implementation
        segments.forEach { segment ->
            when (segment) {
                is TextSegment -> editor.insertText(segment.text.normalizePunctuation())
                is CommandSegment -> executeCommand(segment.command)
            }
        }
    }
}
```

**Option B: Google Cloud Speech-to-Text (Advanced)**
- Better accuracy and multi-language support
- Requires API key and costs per request
- Streaming recognition capability
- Use with gRPC or REST client

### 5.3 Punctuation Normalization (Direct Port)

```kotlin
// lib/voice/punctuation.kt - Kotlin port of web version
val PunctuationMap = mapOf(
    Regex("\\bperiod\\b", RegexOption.IGNORE_CASE) to ".",
    Regex("\\bcomma\\b", RegexOption.IGNORE_CASE) to ",",
    Regex("\\bquestion mark\\b", RegexOption.IGNORE_CASE) to "?",
    Regex("\\bexclamation mark\\b", RegexOption.IGNORE_CASE) to "!",
    Regex("\\belipsis\\b", RegexOption.IGNORE_CASE) to "...",
    Regex("\\bnew line\\b", RegexOption.IGNORE_CASE) to "\n",
    Regex("\\bnew paragraph\\b", RegexOption.IGNORE_CASE) to "\n\n",
    // ... additional mappings from web version
)

fun String.normalizePunctuation(): String {
    var result = this
    PunctuationMap.forEach { (pattern, replacement) ->
        result = result.replace(pattern, replacement)
    }
    return result
}
```

---

## 6. UI/UX Layer - Jetpack Compose Mapping

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

## 8. Development Timeline & Milestones

### Phase-Based Rollout (8-12 weeks for MVP)

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

### Extended Roadmap (Phases 8-11 features)

- Week 14+: Advanced AI features, settings, biometric auth, export/import
- Sync Phase 1: Real-time collaboration (Firebase or Socket.IO), 3-way merge conflict resolution
- Sync Phase 2: Device-specific change tracking, sync history, selective sync per document
- Post-MVP: Real-time collaboration, offline-first robustness with advanced conflict UI

---

## 9. Dependencies & Libraries

### Core Dependencies

```kotlin
// build.gradle.kts

dependencies {
    // Kotlin & Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.1")
    
    // Compose
    implementation("androidx.compose.ui:ui:1.6.0")
    implementation("androidx.compose.material3:material3:1.1.0")
    implementation("androidx.compose.foundation:foundation:1.6.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.6.1")
    
    // Architecture
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.6.1")
    implementation("com.google.dagger:hilt-android:2.47")
    kapt("com.google.dagger:hilt-compiler:2.47")
    
    // Database
    implementation("androidx.room:room-runtime:2.5.2")
    implementation("androidx.room:room-ktx:2.5.2")
    kapt("androidx.room:room-compiler:2.5.2")
    
    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.11.0")
    
    // Security
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    implementation("androidx.biometric:biometric:1.1.0")
    
    // Rich Text (TBD - needs research)
    implementation("androidx.compose.material:material-icons-extended:1.6.0")
    // Possible: io.github.kmp_rish:richtexteditor:x.x.x
    
    // Logging
    implementation("com.jakewharton.timber:timber:5.0.1")
    
    // Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("io.mockk:mockk:1.13.7")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.1")
    androidTestImplementation("androidx.test:runner:1.5.2")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4:1.6.0")
}
```

### Version Compatibility
- **Min SDK:** 28 (Android 9.0 Pie) - covers 99%+ of devices
- **Target SDK:** 34 (Android 14) - latest as of 2024
- **Kotlin:** 1.9+
- **Compose:** 1.6.0+

---

## 10. Rich Text Editor Decision

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

## 11. Testing Strategy Summary

### Test Pyramid
```
           [UI Tests]              (10%)
       [Integration Tests]         (20%)
      [Unit Tests]                 (70%)
```

### Test Domains
1. **Repository layer:** Mock APIs, test sync logic
2. **ViewModel layer:** Mock repositories, test state transformations
3. **Compose UI layer:** Compose testing framework for component interactions
4. **Voice service:** Unit tests for `parseTriggers()` and `normalizePunctuation()`
5. **Database layer:** Room integration tests with test database

---

## 12. Deployment Strategy

### Play Store Submission
1. **Signing:** Create Android App Signing certificate (kept in Google Play Console)
2. **Release Build:** Generate signed APK/AAB with keystore
3. **Version Tracking:** Use same version scheme as web (vX.Y.Z)
4. **Store Listing:** Screenshots, description, privacy policy link
5. **Staged Rollout:** 5% → 10% → 25% → 100% over 2 weeks

### CI/CD Pipeline (GitHub Actions)
```yaml
name: Android CI/CD
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
      - run: ./gradlew build
      - run: ./gradlew test
      - run: ./gradlew connectedAndroidTest
      - run: ./gradlew bundleRelease # Generate Play Store AAB
```

---

## 13. Success Criteria & Rollout Checklist

### MVP Success Criteria
- [ ] All 11 phases from web spec ported to Android
- [ ] 80%+ test coverage
- [ ] Offline-first capability with full local document functionality (login optional)
- [ ] Device-aware sync with pending queue and conflict tracking (when authenticated)
- [ ] Voice input with punctuation normalization
- [ ] Claude AI integration working (requires authentication)
- [ ] Play Store alpha release
- [ ] Performance: Load documents <2s, voice recognition <1s latency
- [ ] Optional authentication: App fully usable without login for local documents

### Post-MVP (Phase 2)
- [ ] Real-time collaborative editing
- [ ] Biometric authentication
- [ ] Document export to PDF
- [ ] AI suggestions and advanced modes
- [ ] Offline drafts with conflict resolution UI

---

## 14. Open Questions & Decisions Needed

1. **Rich Text Editor:** WebView bridge (fast) vs. Compose custom (performant)?
2. **Real-time Collaboration:** Firebase Realtime DB, Socket.IO, or simple polling?
3. **Offline Conflict Resolution:** Current last-write-wins is simple; manual merge UI needed for power users?
4. **Voice Recognition:** Android SpeechRecognizer (free) or Google Cloud Speech (better accuracy)?
5. **API Rate Limiting:** In-memory (single instance) or Redis (distributed)?
6. **Target Device Types:** Phones only, tablets, foldables?
7. **Optional Auth Scope:** Should offline documents be synced when user logs in, or kept separate?
8. **Device Identification:** Generate device ID on first run vs. use Android device ID? Privacy implications?

---

## 15. Resource Requirements

### Team Composition
- **1-2 Android/Kotlin engineers** (full-time, 8-12 weeks)
- **1 QA engineer** (part-time, weeks 6-12)
- **Backend support** (as-needed for API adjustments)

### Infrastructure
- **Development:** Android Studio, Firebase console (optional)
- **Testing:** Android Emulators, physical test devices
- **CI/CD:** GitHub Actions (free tier sufficient)
- **Distribution:** Google Play Developer Account ($25 one-time)

---

## 16. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Rich text editor complexity | Medium | High | Start with WebView MVP, plan Compose migration |
| Voice recognition accuracy | Medium | Medium | Provide manual text entry fallback |
| Real-time sync conflicts | Low | High | Plan conflict resolution UI early |
| API rate limiting scalability | Low | Medium | Monitor usage, plan Redis integration |
| Play Store approval delays | Low | Medium | Submit early, document accessibility features |

---

## Conclusion

The Android port of Dictator is feasible within 8-12 weeks with a clear tech stack, phased development approach, and **optional authentication with device-aware sync**. The app provides full offline functionality without requiring login, while offering progressive authentication for cloud sync capabilities.

The modular web backend (18 REST endpoints + Phase 0 Sync API) provides a stable foundation for the Android client. The Sync API Phase 0 introduces device-aware conflict resolution and pending queue management, enabling robust multi-device synchronization.

Voice input and AI features present the highest technical complexity but have clear implementation patterns based on existing web code. The optional authentication model differentiates the Android app from the web version, enabling true offline-first document creation.

**Next Steps:**
1. Finalize decisions on optional auth implementation (e.g., document ownership model for offline docs)
2. Decide on device identification strategy for sync tracking
3. Create Android project scaffold with Compose + Room + Hilt setup, including sync tables
4. Implement Phase 1 (Optional Auth) and Phase 2 (Documents) as MVP foundation
5. Establish CI/CD pipeline for automated testing and builds
