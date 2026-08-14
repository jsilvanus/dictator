package com.dictator.core.di

import com.dictator.core.data.database.DatabaseManager
import com.dictator.core.data.local.*
import com.dictator.core.data.remote.HttpClientFactory
import com.dictator.core.data.remote.RemoteApiService
import com.dictator.core.domain.repository.*
import com.dictator.core.service.McpService
import com.dictator.core.service.McpServiceImpl
import com.dictator.core.service.PrivacyService
import com.dictator.core.service.PrivacyServiceImpl
import com.dictator.core.service.ToolService
import com.dictator.core.service.ToolServiceImpl
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module
import io.ktor.client.*

/**
 * Koin dependency injection module for Dictator Core.
 * Configures all repositories, services, and utilities for the core library.
 */

val coreModule = module {
    // HTTP Client (singleton)
    single<HttpClient> {
        HttpClientFactory.createHttpClient()
    }
    
    // Remote API Service
    single {
        RemoteApiService(
            httpClient = get(),
            baseUrl = "http://localhost:3000"
        )
    }
    
    // Database (requires initialization by platform layer)
    single {
        DatabaseManager.getInstance()
    }
    
    // Shared Preferences (platform-specific - override in platform modules)
    single<SharedPreferences> {
        InMemorySharedPreferences()
    }
    
    // Local Repositories
    single<UserRepository> {
        LocalUserRepository(get())
    }
    
    single<FolderRepository> {
        LocalFolderRepository(get())
    }
    
    single<DocumentRepository> {
        LocalDocumentRepository(get())
    }
    
    single<DocumentVersionRepository> {
        LocalDocumentVersionRepository(get())
    }
    
    single<ShareRepository> {
        LocalShareRepository(get())
    }
    
    single<AiSessionRepository> {
        LocalAiSessionRepository(get())
    }
    
    single<SyncMetadataRepository> {
        LocalSyncMetadataRepository(get())
    }
    
    single<PendingSyncRepository> {
        LocalPendingSyncRepository(get())
    }
    
    single<ConflictRepository> {
        LocalConflictRepository(get())
    }
    
    single<PrivacyRepository> {
        LocalPrivacyRepository(get())
    }
    
    // Utilities (singletons)
    singleOf(::com.dictator.core.util.voice.VoiceCommandParser)
    singleOf(::com.dictator.core.util.voice.PunctuationNormalizer)
    singleOf(::com.dictator.core.util.validation.Validators)
    singleOf(::com.dictator.core.data.privacy.SensitiveDataDetector)
    singleOf(::com.dictator.core.data.privacy.ProviderPolicyManager)
    singleOf(::com.dictator.core.data.tools.ToolRegistry)
    singleOf(::com.dictator.core.data.tools.ToolPermissionsManager)
    single {
        com.dictator.core.data.tools.ToolExecutor(
            registry = get(),
            permissionsManager = get()
        )
    }
    
    single {
        com.dictator.core.data.privacy.TelemetryService(
            secretKey = "dictator-telemetry-key"
        )
    }
    
    // Services (singletons)
    single<AuthService> {
        AuthServiceImpl(
            remoteApiService = get(),
            userRepository = get(),
            sharedPreferences = get()
        )
    }
    
    single<DocumentService> {
        DocumentServiceImpl(
            documentRepository = get(),
            remoteApiService = get(),
            syncService = get()
        )
    }
    
    single<VoiceService> {
        VoiceServiceImpl(
            voiceCommandParser = get(),
            punctuationNormalizer = get(),
            documentRepository = get()
        )
    }
    
    single<AiService> {
        AiServiceImpl(
            remoteApiService = get(),
            aiSessionRepository = get()
        )
    }
    
    single<SyncService> {
        SyncServiceImpl(
            documentRepository = get(),
            documentVersionRepository = get(),
            syncMetadataRepository = get(),
            pendingSyncRepository = get(),
            conflictRepository = get(),
            remoteApiService = get()
        )
    }
    
    single<FolderService> {
        FolderServiceImpl(
            folderRepository = get(),
            documentRepository = get(),
            remoteApiService = get()
        )
    }
    
    single<ShareService> {
        ShareServiceImpl(
            shareRepository = get(),
            documentRepository = get(),
            remoteApiService = get()
        )
    }
    
    single<McpService> {
        McpServiceImpl(
            httpClient = get(),
            remoteApiService = get()
        )
    }
    
    single<PrivacyService> {
        PrivacyServiceImpl(
            sensitiveDataDetector = get(),
            telemetryService = get(),
            providerPolicyManager = get(),
            privacyRepository = get()
        )
    }
    
    single<ToolService> {
        ToolServiceImpl(
            toolRegistry = get(),
            permissionsManager = get(),
            toolExecutor = get(),
            remoteApiService = get()
        )
    }
}
