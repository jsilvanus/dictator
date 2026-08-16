package com.dictator.core

import com.dictator.core.data.database.DatabaseManager
import com.dictator.core.data.database.DatabaseDriverProvider
import com.dictator.core.di.coreModule
import io.github.aakira.napier.Napier
import org.koin.core.Koin
import org.koin.core.context.startKoin
import org.koin.core.module.Module

/**
 * Dictator Core Library initialization.
 * Must be called once before using any core services.
 */

object DictatorCore {
    private var initialized = false
    
    /**
     * Initialize Dictator Core with database and DI setup.
     * Call this once during app startup.
     */
    fun initialize(
        databaseDriverProvider: DatabaseDriverProvider,
        additionalModules: List<Module> = emptyList()
    ): Koin {
        if (initialized) {
            Napier.w("DictatorCore already initialized, skipping re-initialization")
            return org.koin.core.context.GlobalContext.get()
        }
        
        try {
            // Initialize database
            val driver = databaseDriverProvider.createDriver()
            DatabaseManager.initialize(driver)
            Napier.i("DictatorCore: Database initialized")
            
            // Initialize Koin DI
            val modules = mutableListOf(coreModule)
            modules.addAll(additionalModules)
            
            val koin = startKoin {
                modules(modules)
            }
            
            initialized = true
            Napier.i("DictatorCore: Initialization complete")
            return koin.koin
            
        } catch (e: Exception) {
            Napier.e("DictatorCore: Initialization failed", e)
            throw e
        }
    }
    
    /**
     * Check if core is initialized.
     */
    fun isInitialized(): Boolean = initialized && DatabaseManager.isInitialized()
    
    /**
     * Cleanup resources (database connections, etc.)
     */
    fun shutdown() {
        try {
            DatabaseManager.close()
            org.koin.core.context.stopKoin()
            initialized = false
            Napier.i("DictatorCore: Shutdown complete")
        } catch (e: Exception) {
            Napier.e("DictatorCore: Shutdown error", e)
        }
    }
}
