package com.dictator.android.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import com.dictator.core.data.local.*
import com.dictator.core.data.remote.HttpClientFactory
import com.dictator.core.data.remote.RemoteApiService
import com.dictator.core.domain.repository.*
import com.dictator.core.service.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import io.ktor.client.HttpClient
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "dictator_prefs")

/**
 * Hilt module for core Android dependencies.
 * Provides Dictator Core services to Android app.
 */
@Module
@InstallIn(SingletonComponent::class)
object CoreModule {
    
    @Provides
    @Singleton
    fun provideContext(@ApplicationContext context: Context): Context = context

    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> =
        context.dataStore

    @Provides
    @Singleton
    fun provideHttpClient(): HttpClient = HttpClientFactory.createHttpClient()

    @Provides
    @Singleton
    fun provideRemoteApiService(httpClient: HttpClient): RemoteApiService =
        RemoteApiService(
            httpClient = httpClient,
            baseUrl = "http://localhost:3000"  // TODO: Make configurable
        )

    // Repository bindings
    @Provides
    @Singleton
    fun provideUserRepository(
        @ApplicationContext context: Context
    ): UserRepository = LocalUserRepository(
        com.dictator.core.data.database.DatabaseManager.getInstance()
    )

    @Provides
    @Singleton
    fun provideFolderRepository(
        @ApplicationContext context: Context
    ): FolderRepository = LocalFolderRepository(
        com.dictator.core.data.database.DatabaseManager.getInstance()
    )

    @Provides
    @Singleton
    fun provideDocumentRepository(
        @ApplicationContext context: Context
    ): DocumentRepository = LocalDocumentRepository(
        com.dictator.core.data.database.DatabaseManager.getInstance()
    )

    @Provides
    @Singleton
    fun provideDocumentVersionRepository(
        @ApplicationContext context: Context
    ): DocumentVersionRepository = LocalDocumentVersionRepository(
        com.dictator.core.data.database.DatabaseManager.getInstance()
    )

    @Provides
    @Singleton
    fun provideShareRepository(
        @ApplicationContext context: Context
    ): ShareRepository = LocalShareRepository(
        com.dictator.core.data.database.DatabaseManager.getInstance()
    )

    @Provides
    @Singleton
    fun provideAiSessionRepository(
        @ApplicationContext context: Context
    ): AiSessionRepository = LocalAiSessionRepository(
        com.dictator.core.data.database.DatabaseManager.getInstance()
    )

    @Provides
    @Singleton
    fun provideSyncMetadataRepository(
        @ApplicationContext context: Context
    ): SyncMetadataRepository = LocalSyncMetadataRepository(
        com.dictator.core.data.database.DatabaseManager.getInstance()
    )

    @Provides
    @Singleton
    fun providePendingSyncRepository(
        @ApplicationContext context: Context
    ): PendingSyncRepository = LocalPendingSyncRepository(
        com.dictator.core.data.database.DatabaseManager.getInstance()
    )

    @Provides
    @Singleton
    fun provideConflictRepository(
        @ApplicationContext context: Context
    ): ConflictRepository = LocalConflictRepository(
        com.dictator.core.data.database.DatabaseManager.getInstance()
    )
}
