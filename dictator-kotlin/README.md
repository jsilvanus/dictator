# Dictator Kotlin Core - Phase A

## Overview

This is the **Phase A: Kotlin Core Library** implementation of the Dictator multi-platform port project. The core library provides shared business logic, domain entities, repository interfaces, and service abstractions that will be used by platform-specific implementations (Android UI in Phase B, Desktop UI in Phase C, etc.).

**Status:** Phase A Week 1 - Project Setup & Foundation

## Project Structure

```
dictator-kotlin/
├── settings.gradle.kts                    # Gradle settings with module definitions
├── build.gradle.kts                       # Root build configuration
└── dictator-core/                         # Core library module
    ├── build.gradle.kts                   # Core module configuration
    └── src/
        ├── commonMain/
        │   ├── kotlin/com/dictator/core/
        │   │   ├── domain/                # Domain layer (entities, interfaces)
        │   │   │   ├── entity/            # Data entities (User, Document, etc.)
        │   │   │   ├── model/             # Domain models and value objects
        │   │   │   └── repository/        # Repository interfaces
        │   │   ├── data/                  # Data layer (implementations) - WIP
        │   │   │   ├── local/             # SQLDelight DAOs
        │   │   │   ├── remote/            # API client implementations
        │   │   │   └── repository/        # Repository implementations
        │   │   ├── service/               # Service layer (business logic)
        │   │   │   └── ServiceInterfaces.kt
        │   │   ├── util/                  # Utility functions
        │   │   │   ├── voice/             # Voice parsing & punctuation
        │   │   │   ├── crypto/            # Encryption utilities - WIP
        │   │   │   └── validation/        # Input validation
        │   │   └── di/                    # Dependency injection (Koin)
        │   └── sqldelight/                # Database schema (SQLDelight)
        │       └── com/dictator/core/database/
        │           └── tables.sq
        └── commonTest/                    # Unit tests - WIP
```

## Technology Stack

### Multiplatform-Compatible Libraries (Used in Phase A)
- **Language:** Kotlin 1.9.23
- **Build System:** Gradle with Kotlin DSL
- **Async:** Kotlin Coroutines + Flow
- **Serialization:** Kotlinx Serialization (JSON)
- **Database:** SQLDelight 2.0.1 (multiplatform ORM)
- **HTTP Client:** Ktor Client 2.3.4
- **Dependency Injection:** Koin 3.4.0
- **DateTime:** Kotlinx DateTime 0.4.0
- **UUID:** UUID 0.8.0
- **Logging:** Napier 2.6.1

### JVM-Specific Libraries (Phase A)
- **Database Driver:** SQLite driver (app.cash.sqldelight:sqlite-driver)
- **HTTP Engine:** OkHttp (io.ktor:ktor-client-okhttp)
- **Logging Backends:** SLF4J + SLF4J Simple
- **Testing:** JUnit 4, Mockito, Kotlin Test

## Phase A Deliverables

### Week 1: Project Setup ✅
- [x] Gradle multimodule structure
- [x] Dependency management and build configuration
- [x] SQLDelight schema definition
- [x] Domain entity definitions
- [x] Repository interfaces
- [x] Utility functions (voice, validation)
- [x] Service layer interfaces
- [x] Koin DI module setup

### Week 2-3: Domain Entities & Database Schema (WIP)
- [ ] Complete SQLDelight migrations
- [ ] Generate SQLDelight Dao classes
- [ ] Create type-safe database queries
- [ ] Implement entity converters (database ↔ domain)

### Week 4: Repository Layer (WIP)
- [ ] Implement local data sources (SQLDelight DAOs)
- [ ] Repository pattern implementations
- [ ] Database transaction handling
- [ ] Flow-based reactive queries

### Week 5: Remote Data Source & API Client (WIP)
- [ ] Ktor HTTP client configuration
- [ ] API service interfaces and implementations
- [ ] Request/response serialization
- [ ] Error handling and retry logic

### Week 6: Service Layer & Tests (WIP)
- [ ] Service implementations (orchestration layer)
- [ ] Business logic for all services
- [ ] Unit tests (target: 80%+ coverage)
- [ ] Integration tests

## Building Phase A Core

### Prerequisites
- Java 11+
- Gradle 7.6+
- Kotlin 1.9.23

### Build Commands

```bash
# Navigate to the Kotlin project
cd dictator-kotlin

# Build the core library
./gradlew build

# Run tests
./gradlew test

# Build without tests
./gradlew build -x test

# Generate detailed build report
./gradlew build --info
```

### Generated Artifacts

After building, the core library will be available for use by platform-specific implementations:
- JAR file: `dictator-core/build/libs/dictator-core-*.jar`
- Available in local Maven repository for multiplatform use

## Architecture & Design Patterns

### Layered Architecture

The core library follows a clean architecture with separation of concerns:

1. **Domain Layer** (`domain/`)
   - Pure business logic and entity definitions
   - No external dependencies (except Kotlin stdlib)
   - Interfaces that define contracts for data access
   - Types: Entities, Repository interfaces, Use case definitions

2. **Data Layer** (`data/`)
   - Implementations of repository interfaces
   - Database access via SQLDelight
   - Remote API calls via Ktor Client
   - Type conversions between database and domain models

3. **Service Layer** (`service/`)
   - High-level business logic orchestration
   - Coordinates between repositories
   - Use case implementations
   - Cross-cutting concerns (logging, error handling)

4. **Utility Layer** (`util/`)
   - Reusable functions for validation, encryption, voice processing
   - No state, pure functions
   - Language/encoding utilities

### Design Patterns Used

- **Repository Pattern:** Abstracts data sources (local/remote)
- **Dependency Injection:** Koin for loose coupling and testability
- **Entity-Repository-Service:** Clean separation of concerns
- **Sealed Classes:** Type-safe domain models
- **Data Classes:** Immutable value objects
- **Coroutines + Flow:** Reactive, async operations
- **Multiplatform:** Kotlin multiplatform for code reuse across platforms

## Database Schema

The core library defines 9 tables in SQLDelight:

1. **users** - User accounts
2. **folders** - Document organization
3. **documents** - Main content container
4. **documentVersions** - Version history per document
5. **shares** - Document sharing and permissions
6. **aiSessions** - AI conversation sessions
7. **syncMetadata** - Per-document sync state tracking
8. **pendingSyncQueue** - Offline change queue
9. **documentConflicts** - Device conflict records

### Offline-First Sync Architecture

Phase A core supports offline-first with optional sync:
- All data stored locally in SQLDelight
- `syncMetadata` table tracks sync state per document
- `pendingSyncQueue` queues changes when offline
- `documentConflicts` manages multi-device conflicts

See `SYNC_API_PHASE0.md` in the root repository for detailed sync protocol.

## Dependency Injection (Koin)

The core library uses Koin for DI configuration:

```kotlin
// In your application (Android, Desktop, etc.)
import org.koin.core.context.startKoin
import com.dictator.core.di.coreModule

fun main() {
    startKoin {
        modules(coreModule)
    }
    
    // Now inject services
    val authService: AuthService = get()
}
```

## Testing Strategy

### Test Organization

- **Unit Tests** (70% of tests): Service and utility logic
  - Location: `src/commonTest/kotlin/com/dictator/core/`
  - Framework: Kotlin Test + JUnit 4

- **Integration Tests** (20% of tests): Repository and database layer
  - Uses in-memory SQLite for fast testing
  - No external dependencies

- **Contract Tests** (10% of tests): API client contracts
  - Mocked HTTP responses
  - Contract verification

### Target Coverage

- **Overall:** 80%+ code coverage
- **Domain & Service:** 90%+
- **Data layer:** 80%+
- **Utils:** 70%+

### Running Tests

```bash
# Run all tests
./gradlew test

# Run with coverage report
./gradlew test jacocoTestReport

# Run specific test class
./gradlew test --tests "com.dictator.core.util.voice.VoiceCommandParserTest"
```

## Next Steps (Phase B & Beyond)

### Phase B: Android UI Layer (Weeks 7-14)
- Depends on: Phase A Core completion
- Implements: Jetpack Compose UI using Phase A services
- Adds: Android-specific platform APIs (SpeechRecognizer, Keystore, etc.)

### Phase C: Kotlin Multiplatform (Weeks 15+)
- Migrates: Phase A core to KMP-compatible structure
- Extends: Support for iOS, Desktop via Compose Multiplatform

## Contributing

When adding new features to Phase A core:

1. **Add domain entities** to `domain/entity/`
2. **Define repository interfaces** in `domain/repository/`
3. **Add service interfaces** to `service/`
4. **Implement data layer** in `data/` (uses SQLDelight)
5. **Write comprehensive tests** in `commonTest/`
6. **Update DI configuration** in `di/CoreModule.kt`
7. **Document new modules** in this README

## References

- [ANDROID_PORTING_PLAN.md](../ANDROID_PORTING_PLAN.md) - Full multiplatform architecture plan
- [Kotlin Coroutines](https://kotlinlang.org/docs/coroutines-overview.html)
- [SQLDelight Documentation](https://cashapp.github.io/sqldelight/)
- [Ktor Client](https://ktor.io/docs/client-overview.html)
- [Koin DI](https://insert-koin.io/)
- [Kotlinx Serialization](https://github.com/Kotlin/kotlinx.serialization)

## License

Same as parent Dictator project
