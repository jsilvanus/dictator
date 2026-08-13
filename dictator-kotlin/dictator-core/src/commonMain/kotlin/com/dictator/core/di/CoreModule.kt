package com.dictator.core.di

import com.dictator.core.data.database.DatabaseManager
import com.dictator.core.data.local.*
import com.dictator.core.data.remote.HttpClientFactory
import com.dictator.core.data.remote.RemoteApiService
import com.dictator.core.domain.repository.*
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
    
    // Utilities (singletons)
    singleOf(::com.dictator.core.util.voice.VoiceCommandParser)
    singleOf(::com.dictator.core.util.voice.PunctuationNormalizer)
    singleOf(::com.dictator.core.util.validation.Validators)
    
    // Services (singletons)
    single<AuthService> {
        com.dictator.core.service.AuthServiceImpl(
            remoteApiService = get(),
            userRepository = get(),
            sharedPreferences = get()
        )
    }
    
    single<DocumentService> {
        com.dictator.core.service.DocumentServiceImpl(
            documentRepository = get(),
            remoteApiService = get(),
            syncService = get()
        )
    }
    
    single<VoiceService> {
        com.dictator.core.service.VoiceServiceImpl(
            voiceCommandParser = get(),
            punctuationNormalizer = get(),
            documentRepository = get()
        )
    }
    
    single<AiService> {
        com.dictator.core.service.AiServiceImpl(
            remoteApiService = get(),
            aiSessionRepository = get()
        )
    }
    
    single<SyncService> {
        com.dictator.core.service.SyncServiceImpl(
            documentRepository = get(),
            documentVersionRepository = get(),
            syncMetadataRepository = get(),
            pendingSyncRepository = get(),
            conflictRepository = get(),
            remoteApiService = get()
        )
    }
    
    single<FolderService> {
        com.dictator.core.service.FolderServiceImpl(
            folderRepository = get(),
            documentRepository = get(),
            remoteApiService = get()
        )
    }
    
    single<ShareService> {
        com.dictator.core.service.ShareServiceImpl(
            shareRepository = get(),
            documentRepository = get(),
            remoteApiService = get()
        )
    }
}
